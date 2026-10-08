-- SUPABASE BASELINE 01
-- Reconstructs project-owned database objects that existed before the first tracked
-- feature migration (20261006152000_story_translation_01.sql).
--
-- IMPORTANT: this baseline is intended for clean/local bootstrap. On the already
-- provisioned linked production project it must be MARKED AS APPLIED in migration
-- history before any future db push; it must not be executed there as a new change.

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION "public"."admin_member_details"("target_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "display_name" "text", "username" "text", "first_name" "text", "last_name" "text", "country" "text", "city" "text", "phone" "text", "bio" "text", "role" "text", "account_status" "text", "auth_created_at" timestamp with time zone, "profile_created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin

    -- --------------------------------------------------------
    -- ADMIN GUARD
    -- --------------------------------------------------------

    if not public.is_admin() then
        raise exception 'Administrator access required';
    end if;


    -- --------------------------------------------------------
    -- MEMBER DETAILS
    -- --------------------------------------------------------

    return query

    select
        u.id                                    as user_id,
        u.email::text                           as email,

        p.display_name::text                    as display_name,
        p.username::text                        as username,

        d.first_name::text                      as first_name,
        d.last_name::text                       as last_name,
        d.country::text                         as country,
        d.city::text                            as city,
        d.phone::text                           as phone,

        p.bio::text                             as bio,

        coalesce(r.role, 'user')::text          as role,
        coalesce(r.account_status, 'active')::text
                                                as account_status,

        u.created_at                            as auth_created_at,
        p.created_at                            as profile_created_at,
        u.last_sign_in_at                       as last_sign_in_at,
        u.email_confirmed_at                    as email_confirmed_at

    from auth.users u

    left join public.profiles p
        on p.id = u.id

    left join public.profile_private_details d
        on d.user_id = u.id

    left join public.user_roles r
        on r.user_id = u.id

    where u.id = target_user_id;

end;
$$;


ALTER FUNCTION "public"."admin_member_details"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_signup_username"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
    requested_username text;
begin
    requested_username := lower(
        btrim(coalesce(new.raw_user_meta_data ->> 'username', ''))
    );

    if requested_username = '' then
        return new;
    end if;

    if requested_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
        raise exception 'Invalid public username.';
    end if;

    update public.profiles
    set
        username = requested_username,
        updated_at = now()
    where id = new.id;

    return new;
end;
$_$;


ALTER FUNCTION "public"."apply_signup_username"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_profile_username"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
    base_name text;
begin
    if new.username is null or btrim(new.username) = '' then
        base_name := trim(both '-' from regexp_replace(
            lower(coalesce(new.display_name, '')),
            '[^a-z0-9]+',
            '-',
            'g'
        ));

        if base_name is null or length(base_name) < 3 then
            base_name := 'member';
        end if;

        new.username :=
            left(base_name, 20)
            || '-'
            || left(replace(new.id::text, '-', ''), 8);
    else
        new.username := lower(btrim(new.username));
    end if;

    return new;
end;
$$;


ALTER FUNCTION "public"."ensure_profile_username"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    insert into public.user_roles (user_id, role, account_status)
    values (new.id, 'user', 'active')
    on conflict (user_id) do nothing;

    return new;
end;
$$;


ALTER FUNCTION "public"."ensure_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    insert into public.profiles (
        id,
        display_name
    )
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'display_name', ''),
            nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
            'Member'
        )
    )
    on conflict (id) do nothing;

    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_member"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select exists (
        select 1
        from public.user_roles
        where user_id = auth.uid()
          and account_status = 'active'
    );
$$;


ALTER FUNCTION "public"."is_active_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    select exists (
        select 1
        from public.user_roles
        where user_id = auth.uid()
          and role = 'admin'
    );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."file_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "file_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."file_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."heritage_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "summary" "text",
    "category" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "author" "text" NOT NULL,
    "story_by" "text",
    "adaptation_by" "text",
    "source_credit" "text",
    "content" "jsonb" DEFAULT '{"sections": []}'::"jsonb" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "review_flags" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "display_order" integer,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "cover_image" "text",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "heritage_articles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."heritage_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_private_details" (
    "user_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "country" "text",
    "city" "text",
    "phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profile_private_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_public_contacts" (
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "show_email" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_public_contacts_email_check" CHECK ((("email" IS NULL) OR (("char_length"("email") <= 320) AND (POSITION(('@'::"text") IN ("email")) > 1))))
);


ALTER TABLE "public"."profile_public_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_path" "text",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "bio" "text",
    "last_seen_at" timestamp with time zone,
    "username" "text" NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_username_format_check" CHECK (("username" ~ '^[a-z0-9][a-z0-9._-]{2,29}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "eyebrow" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "details" "text",
    "content" "text" NOT NULL,
    "author" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "visibility" "text" DEFAULT 'community'::"text" NOT NULL,
    "moderation_status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    CONSTRAINT "stories_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'hidden'::"text"]))),
    CONSTRAINT "stories_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"]))),
    CONSTRAINT "stories_visibility_check" CHECK (("visibility" = ANY (ARRAY['community'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."story_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "caption" "text",
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."story_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."story_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "story_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."story_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "text",
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size" bigint,
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "moderation_status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    CONSTRAINT "user_files_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'hidden'::"text"]))),
    CONSTRAINT "user_files_visibility_check" CHECK (("visibility" = ANY (ARRAY['community'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."user_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "user_roles_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";



ALTER TABLE ONLY "public"."file_ratings"
    ADD CONSTRAINT "file_ratings_file_user_key" UNIQUE ("file_id", "user_id");



ALTER TABLE ONLY "public"."file_ratings"
    ADD CONSTRAINT "file_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."heritage_articles"
    ADD CONSTRAINT "heritage_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."heritage_articles"
    ADD CONSTRAINT "heritage_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profile_private_details"
    ADD CONSTRAINT "profile_private_details_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profile_public_contacts"
    ADD CONSTRAINT "profile_public_contacts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_media"
    ADD CONSTRAINT "story_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_ratings"
    ADD CONSTRAINT "story_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_ratings"
    ADD CONSTRAINT "story_ratings_story_user_key" UNIQUE ("story_id", "user_id");



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "file_ratings_file_id_idx" ON "public"."file_ratings" USING "btree" ("file_id");



CREATE INDEX "file_ratings_user_id_idx" ON "public"."file_ratings" USING "btree" ("user_id");



CREATE UNIQUE INDEX "profiles_username_unique" ON "public"."profiles" USING "btree" ("lower"("username"));



CREATE INDEX "stories_author_id_idx" ON "public"."stories" USING "btree" ("author_id");



CREATE INDEX "stories_public_order_idx" ON "public"."stories" USING "btree" ("status", "display_order", "created_at");



CREATE INDEX "stories_visibility_idx" ON "public"."stories" USING "btree" ("visibility", "status", "created_at");



CREATE INDEX "story_media_story_id_idx" ON "public"."story_media" USING "btree" ("story_id");



CREATE INDEX "story_media_user_id_idx" ON "public"."story_media" USING "btree" ("user_id");



CREATE INDEX "story_ratings_story_id_idx" ON "public"."story_ratings" USING "btree" ("story_id");



CREATE INDEX "story_ratings_user_id_idx" ON "public"."story_ratings" USING "btree" ("user_id");



CREATE INDEX "user_files_story_id_idx" ON "public"."user_files" USING "btree" ("story_id");



CREATE INDEX "user_files_user_id_idx" ON "public"."user_files" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "user_files_visibility_idx" ON "public"."user_files" USING "btree" ("visibility", "created_at" DESC);



CREATE OR REPLACE TRIGGER "profiles_ensure_username" BEFORE INSERT OR UPDATE OF "username" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_profile_username"();



CREATE OR REPLACE TRIGGER "set_heritage_articles_updated_at" BEFORE UPDATE ON "public"."heritage_articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."file_ratings"
    ADD CONSTRAINT "file_ratings_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."user_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_ratings"
    ADD CONSTRAINT "file_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_private_details"
    ADD CONSTRAINT "profile_private_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_public_contacts"
    ADD CONSTRAINT "profile_public_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."story_media"
    ADD CONSTRAINT "story_media_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_media"
    ADD CONSTRAINT "story_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_ratings"
    ADD CONSTRAINT "story_ratings_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_ratings"
    ADD CONSTRAINT "story_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can read all file ratings" ON "public"."file_ratings" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all stories" ON "public"."stories" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all story ratings" ON "public"."story_ratings" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all user files" ON "public"."user_files" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Authors can read own stories" ON "public"."stories" FOR SELECT TO "authenticated" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Owners can read own user files" ON "public"."user_files" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Public can read approved community stories" ON "public"."stories" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"text") AND ("visibility" = 'community'::"text") AND ("moderation_status" = 'approved'::"text")));



CREATE POLICY "Public can read approved community user files" ON "public"."user_files" FOR SELECT TO "authenticated", "anon" USING ((("visibility" = 'community'::"text") AND ("moderation_status" = 'approved'::"text")));



CREATE POLICY "Public can read published heritage articles" ON "public"."heritage_articles" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));



CREATE POLICY "Users can read own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "active members can delete files" ON "public"."user_files" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can delete stories" ON "public"."stories" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can insert files" ON "public"."user_files" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can insert stories" ON "public"."stories" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can update profiles" ON "public"."profiles" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can write file ratings" ON "public"."file_ratings" AS RESTRICTIVE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can write public contacts" ON "public"."profile_public_contacts" AS RESTRICTIVE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "active members can write story ratings" ON "public"."story_ratings" AS RESTRICTIVE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_active_member"() OR "public"."is_admin"()));



CREATE POLICY "admins can delete all stories" ON "public"."stories" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins can delete all user files" ON "public"."user_files" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins can update all stories" ON "public"."stories" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins can update all user files" ON "public"."user_files" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins can update member account status" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK (("public"."is_admin"() AND (("user_id" <> "auth"."uid"()) OR ("account_status" = 'active'::"text"))));


CREATE POLICY "file moderation write guard insert" ON "public"."user_files" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("user_id" = "auth"."uid"()) AND ((("visibility" = 'private'::"text") AND ("moderation_status" = 'approved'::"text")) OR (("visibility" = 'community'::"text") AND ("moderation_status" = 'pending'::"text"))) AND ("moderated_at" IS NULL) AND ("moderated_by" IS NULL))));



CREATE POLICY "file moderation write guard update" ON "public"."user_files" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("user_id" = "auth"."uid"()) AND ((("visibility" = 'private'::"text") AND ("moderation_status" = 'approved'::"text")) OR (("visibility" = 'community'::"text") AND ("moderation_status" = 'pending'::"text"))) AND ("moderated_at" IS NULL) AND ("moderated_by" IS NULL))));



ALTER TABLE "public"."file_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "file_ratings_delete_own" ON "public"."file_ratings" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "file_ratings_insert_own" ON "public"."file_ratings" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text")))))));



CREATE POLICY "file_ratings_public_read" ON "public"."file_ratings" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text"))))));



CREATE POLICY "file_ratings_update_own" ON "public"."file_ratings" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text"))))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text")))))));



ALTER TABLE "public"."heritage_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_contacts_delete_own" ON "public"."profile_public_contacts" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "profile_contacts_insert_own" ON "public"."profile_public_contacts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "profile_contacts_read_visible_or_own" ON "public"."profile_public_contacts" FOR SELECT TO "authenticated", "anon" USING ((("show_email" = true) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "profile_contacts_update_own" ON "public"."profile_public_contacts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profile_private_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_public_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stories_delete_own" ON "public"."stories" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "stories_insert_own" ON "public"."stories" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "stories_update_own" ON "public"."stories" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "story moderation write guard insert" ON "public"."stories" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("author_id" = "auth"."uid"()) AND ((("visibility" = 'private'::"text") AND ("moderation_status" = 'approved'::"text")) OR (("visibility" = 'community'::"text") AND ("moderation_status" = 'pending'::"text"))) AND ("moderated_at" IS NULL) AND ("moderated_by" IS NULL))));



CREATE POLICY "story moderation write guard update" ON "public"."stories" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (("public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("author_id" = "auth"."uid"()) AND ((("visibility" = 'private'::"text") AND ("moderation_status" = 'approved'::"text")) OR (("visibility" = 'community'::"text") AND ("moderation_status" = 'pending'::"text"))) AND ("moderated_at" IS NULL) AND ("moderated_by" IS NULL))));



ALTER TABLE "public"."story_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "story_media_delete_own_story" ON "public"."story_media" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_media"."story_id") AND ("s"."author_id" = "auth"."uid"()))))));



CREATE POLICY "story_media_insert_own_story" ON "public"."story_media" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_media"."story_id") AND ("s"."author_id" = "auth"."uid"()))))));



CREATE POLICY "story_media_public_read" ON "public"."story_media" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_media"."story_id") AND ("s"."status" = 'published'::"text") AND (("s"."visibility" = 'community'::"text") OR ("s"."author_id" = "auth"."uid"()))))));



CREATE POLICY "story_media_update_own_story" ON "public"."story_media" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_media"."story_id") AND ("s"."author_id" = "auth"."uid"())))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_media"."story_id") AND ("s"."author_id" = "auth"."uid"()))))));



ALTER TABLE "public"."story_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "story_ratings_delete_own" ON "public"."story_ratings" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "story_ratings_insert_own" ON "public"."story_ratings" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_ratings"."story_id") AND ("s"."status" = 'published'::"text") AND ("s"."visibility" = 'community'::"text") AND ("s"."author_id" IS DISTINCT FROM "auth"."uid"()))))));



CREATE POLICY "story_ratings_public_read" ON "public"."story_ratings" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_ratings"."story_id") AND ("s"."status" = 'published'::"text") AND ("s"."visibility" = 'community'::"text") AND ("s"."moderation_status" = 'approved'::"text")))));



CREATE POLICY "story_ratings_update_own" ON "public"."story_ratings" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_ratings"."story_id") AND ("s"."status" = 'published'::"text") AND ("s"."visibility" = 'community'::"text") AND ("s"."author_id" IS DISTINCT FROM "auth"."uid"())))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_ratings"."story_id") AND ("s"."status" = 'published'::"text") AND ("s"."visibility" = 'community'::"text") AND ("s"."author_id" IS DISTINCT FROM "auth"."uid"()))))));


ALTER TABLE "public"."user_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_files_delete_own" ON "public"."user_files" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_files_insert_own" ON "public"."user_files" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_files_update_own" ON "public"."user_files" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can insert own private profile details" ON "public"."profile_private_details" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"()));



CREATE POLICY "users can read own private profile details" ON "public"."profile_private_details" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "users can update own private profile details" ON "public"."profile_private_details" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_member_details"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_member_details"("target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."file_ratings" TO "service_role";
GRANT SELECT ON TABLE "public"."file_ratings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."file_ratings" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."heritage_articles" TO "service_role";
GRANT SELECT ON TABLE "public"."heritage_articles" TO "anon";
GRANT SELECT ON TABLE "public"."heritage_articles" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profile_private_details" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profile_private_details" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profile_public_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."profile_public_contacts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profile_public_contacts" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_path") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("last_seen_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."stories" TO "service_role";
GRANT SELECT ON TABLE "public"."stories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stories" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."story_media" TO "service_role";
GRANT SELECT ON TABLE "public"."story_media" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."story_media" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."story_ratings" TO "service_role";
GRANT SELECT ON TABLE "public"."story_ratings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."story_ratings" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_files" TO "service_role";
GRANT SELECT ON TABLE "public"."user_files" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_files" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_roles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";

-- Project-owned global event trigger. Supabase-managed event triggers are intentionally excluded.
DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    EXECUTE FUNCTION public.rls_auto_enable();

-- Project-owned auth.users triggers. The auth schema itself is Supabase-managed and is not baselined.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_user_role();

DROP TRIGGER IF EXISTS zz_apply_signup_username ON auth.users;
CREATE TRIGGER zz_apply_signup_username
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.apply_signup_username();

-- Project Storage bucket configuration. Supabase's storage schema/tables/functions are platform-managed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('avatars', 'avatars', true, 5242880, ARRAY['image/*']::text[]),
    ('heritage', 'heritage', true, 10485760, ARRAY['image/*']::text[]),
    ('stories', 'stories', true, 10485760, ARRAY['image/*']::text[]),
    (
        'user-files',
        'user-files',
        false,
        52428800,
        ARRAY[
            'image/*',
            'audio/*',
            'video/mp4',
            'text/*',
            'application/json',
            'application/xml',
            'application/rtf',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.oasis.opendocument.text'
        ]::text[]
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Project-owned Storage RLS policies captured from the linked project.

DROP POLICY IF EXISTS "active members can delete user storage" ON "storage"."objects";

CREATE POLICY "active members can delete user storage" ON "storage"."objects" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("bucket_id" <> ALL (ARRAY['user-files'::"text", 'avatars'::"text"])) OR "public"."is_active_member"() OR "public"."is_admin"()));

DROP POLICY IF EXISTS "active members can insert user storage" ON "storage"."objects";

CREATE POLICY "active members can insert user storage" ON "storage"."objects" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" <> ALL (ARRAY['user-files'::"text", 'avatars'::"text"])) OR "public"."is_active_member"() OR "public"."is_admin"()));

DROP POLICY IF EXISTS "active members can update user storage" ON "storage"."objects";

CREATE POLICY "active members can update user storage" ON "storage"."objects" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("bucket_id" <> ALL (ARRAY['user-files'::"text", 'avatars'::"text"])) OR "public"."is_active_member"() OR "public"."is_admin"())) WITH CHECK ((("bucket_id" <> ALL (ARRAY['user-files'::"text", 'avatars'::"text"])) OR "public"."is_active_member"() OR "public"."is_admin"()));

DROP POLICY IF EXISTS "admins can delete user file storage" ON "storage"."objects";

CREATE POLICY "admins can delete user file storage" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'user-files'::"text") AND "public"."is_admin"()));

DROP POLICY IF EXISTS "avatars_delete_own_folder" ON "storage"."objects";

CREATE POLICY "avatars_delete_own_folder" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ( SELECT ("auth"."uid"())::"text" AS "uid"))));

DROP POLICY IF EXISTS "avatars_insert_own_folder" ON "storage"."objects";

CREATE POLICY "avatars_insert_own_folder" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ( SELECT ("auth"."uid"())::"text" AS "uid"))));

DROP POLICY IF EXISTS "avatars_public_read" ON "storage"."objects";

CREATE POLICY "avatars_public_read" ON "storage"."objects" FOR SELECT TO "authenticated", "anon" USING (("bucket_id" = 'avatars'::"text"));

DROP POLICY IF EXISTS "avatars_select_own_folder" ON "storage"."objects";

CREATE POLICY "avatars_select_own_folder" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ( SELECT ("auth"."uid"())::"text" AS "uid"))));

DROP POLICY IF EXISTS "avatars_update_own_folder" ON "storage"."objects";

CREATE POLICY "avatars_update_own_folder" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ( SELECT ("auth"."uid"())::"text" AS "uid")))) WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ( SELECT ("auth"."uid"())::"text" AS "uid"))));

DROP POLICY IF EXISTS "heritage_admin_delete" ON "storage"."objects";

CREATE POLICY "heritage_admin_delete" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'heritage'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))));

DROP POLICY IF EXISTS "heritage_admin_insert" ON "storage"."objects";

CREATE POLICY "heritage_admin_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'heritage'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))));

DROP POLICY IF EXISTS "heritage_admin_select" ON "storage"."objects";

CREATE POLICY "heritage_admin_select" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'heritage'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))));

DROP POLICY IF EXISTS "heritage_admin_update" ON "storage"."objects";

CREATE POLICY "heritage_admin_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'heritage'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))))) WITH CHECK ((("bucket_id" = 'heritage'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))));

DROP POLICY IF EXISTS "stories_images_delete_own_folder" ON "storage"."objects";

CREATE POLICY "stories_images_delete_own_folder" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'stories'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

DROP POLICY IF EXISTS "stories_images_insert_own_folder" ON "storage"."objects";

CREATE POLICY "stories_images_insert_own_folder" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'stories'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

DROP POLICY IF EXISTS "stories_images_public_read" ON "storage"."objects";

CREATE POLICY "stories_images_public_read" ON "storage"."objects" FOR SELECT TO "authenticated", "anon" USING (("bucket_id" = 'stories'::"text"));

DROP POLICY IF EXISTS "stories_images_update_own_folder" ON "storage"."objects";

CREATE POLICY "stories_images_update_own_folder" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'stories'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"))) WITH CHECK ((("bucket_id" = 'stories'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

DROP POLICY IF EXISTS "user_files_storage_delete_own" ON "storage"."objects";

CREATE POLICY "user_files_storage_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'user-files'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

DROP POLICY IF EXISTS "user_files_storage_insert_own" ON "storage"."objects";

CREATE POLICY "user_files_storage_insert_own" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'user-files'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

DROP POLICY IF EXISTS "user_files_storage_read" ON "storage"."objects";

CREATE POLICY "user_files_storage_read" ON "storage"."objects" FOR SELECT TO "authenticated", "anon" USING ((("bucket_id" = 'user-files'::"text") AND ((("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
   FROM "public"."user_files" "uf"
  WHERE (("uf"."storage_path" = "objects"."name") AND ("uf"."visibility" = 'community'::"text")))))));

DROP POLICY IF EXISTS "user_files_storage_update_own" ON "storage"."objects";

CREATE POLICY "user_files_storage_update_own" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'user-files'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"))) WITH CHECK ((("bucket_id" = 'user-files'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

SET check_function_bodies = true;
