-- VIDEO RATING SUPPORT 01
-- Extend existing file rating policies from image/audio to image/audio/video.
-- No table/schema changes. Existing ownership, visibility and account rules are preserved.
DROP POLICY IF EXISTS "file_ratings_insert_own" ON public.file_ratings;

CREATE POLICY "file_ratings_insert_own" ON "public"."file_ratings" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text") OR ("f"."mime_type" ~~ 'video/%'::"text")))))));

DROP POLICY IF EXISTS "file_ratings_public_read" ON public.file_ratings;

CREATE POLICY "file_ratings_public_read" ON "public"."file_ratings" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text") OR ("f"."mime_type" ~~ 'video/%'::"text"))))));

DROP POLICY IF EXISTS "file_ratings_update_own" ON public.file_ratings;

CREATE POLICY "file_ratings_update_own" ON "public"."file_ratings" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text") OR ("f"."mime_type" ~~ 'video/%'::"text"))))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."user_files" "f"
  WHERE (("f"."id" = "file_ratings"."file_id") AND ("f"."visibility" = 'community'::"text") AND ("f"."user_id" <> "auth"."uid"()) AND (("f"."mime_type" ~~ 'image/%'::"text") OR ("f"."mime_type" ~~ 'audio/%'::"text") OR ("f"."mime_type" ~~ 'video/%'::"text")))))));
