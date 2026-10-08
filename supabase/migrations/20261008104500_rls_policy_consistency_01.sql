-- RLS POLICY CONSISTENCY 01
-- Consolidates overlapping permissive policies so the stricter account,
-- ownership and target-visibility rules are the only write paths.

-- -----------------------------------------------------------------------------
-- Heritage ratings
-- -----------------------------------------------------------------------------

-- Remove superseded broad policies and any prior canonical variants so this
-- migration is deterministic when applied to the current production schema.
drop policy if exists "Heritage ratings are publicly readable"
    on public.heritage_ratings;

drop policy if exists "Users can create own Heritage rating"
    on public.heritage_ratings;

drop policy if exists "Users can update own Heritage rating"
    on public.heritage_ratings;

drop policy if exists "Users can delete own Heritage rating"
    on public.heritage_ratings;

drop policy if exists "heritage_ratings_public_read"
    on public.heritage_ratings;

drop policy if exists "heritage_ratings_active_insert"
    on public.heritage_ratings;

drop policy if exists "heritage_ratings_own_update"
    on public.heritage_ratings;

drop policy if exists "heritage_ratings_own_delete"
    on public.heritage_ratings;

create policy "heritage_ratings_public_read"
    on public.heritage_ratings
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.heritage_articles h
            where h.slug = heritage_ratings.article_slug
              and h.status = 'published'
        )
    );

create policy "heritage_ratings_active_insert"
    on public.heritage_ratings
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and public.is_active_member()
        and exists (
            select 1
            from public.heritage_articles h
            where h.slug = heritage_ratings.article_slug
              and h.status = 'published'
        )
    );

create policy "heritage_ratings_own_update"
    on public.heritage_ratings
    for update
    to authenticated
    using (
        user_id = auth.uid()
        and public.is_active_member()
    )
    with check (
        user_id = auth.uid()
        and rating between 1 and 5
        and public.is_active_member()
    );

create policy "heritage_ratings_own_delete"
    on public.heritage_ratings
    for delete
    to authenticated
    using (
        user_id = auth.uid()
        and public.is_active_member()
    );

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------

-- Remove all superseded insert/update/delete variants. PostgreSQL permissive
-- policies combine with OR, so leaving an older weaker policy in place would
-- bypass a newer stricter policy.
drop policy if exists "Active users can create own comments"
    on public.comments;

drop policy if exists "Authenticated users can create own comments"
    on public.comments;

drop policy if exists "Authenticated users can create own visible-target comments"
    on public.comments;

drop policy if exists "Authors can update own comments"
    on public.comments;

drop policy if exists "Authors can delete own comments"
    on public.comments;

drop policy if exists "Authors or admins can update comments"
    on public.comments;

drop policy if exists "Authors or admins can delete comments"
    on public.comments;

drop policy if exists "Comments follow target visibility"
    on public.comments;

create policy "Comments follow target visibility"
    on public.comments
    for select
    to anon, authenticated
    using (
        (
            target_type = 'heritage'
            and exists (
                select 1
                from public.heritage_articles h
                where h.slug = comments.target_id
                  and h.status = 'published'
            )
        )
        or (
            target_type = 'story'
            and exists (
                select 1
                from public.stories s
                where s.id = comments.target_id
            )
        )
        or (
            target_type = 'file'
            and exists (
                select 1
                from public.user_files f
                where f.id::text = comments.target_id
            )
        )
    );

create policy "Authenticated users can create own visible-target comments"
    on public.comments
    for insert
    to authenticated
    with check (
        author_id = auth.uid()
        and public.is_active_member()
        and (
            (
                target_type = 'heritage'
                and exists (
                    select 1
                    from public.heritage_articles h
                    where h.slug = comments.target_id
                      and h.status = 'published'
                )
            )
            or (
                target_type = 'story'
                and exists (
                    select 1
                    from public.stories s
                    where s.id = comments.target_id
                )
            )
            or (
                target_type = 'file'
                and exists (
                    select 1
                    from public.user_files f
                    where f.id::text = comments.target_id
                )
            )
        )
    );

create policy "Authors or admins can update comments"
    on public.comments
    for update
    to authenticated
    using (
        public.is_active_member()
        and (
            author_id = auth.uid()
            or public.is_admin()
        )
    )
    with check (
        public.is_active_member()
        and (
            author_id = auth.uid()
            or public.is_admin()
        )
    );

create policy "Authors or admins can delete comments"
    on public.comments
    for delete
    to authenticated
    using (
        public.is_active_member()
        and (
            author_id = auth.uid()
            or public.is_admin()
        )
    );

-- -----------------------------------------------------------------------------
-- Comment reactions
-- -----------------------------------------------------------------------------

-- Keep read visibility inherited from comments, but require an active account
-- for every reaction mutation so direct API access matches the UI gate.
drop policy if exists "Users can add own comment reaction"
    on public.comment_reactions;

drop policy if exists "Users can update own comment reaction"
    on public.comment_reactions;

drop policy if exists "Users can delete own comment reaction"
    on public.comment_reactions;

drop policy if exists "Users can add own visible comment reaction"
    on public.comment_reactions;

drop policy if exists "Users can update own visible comment reaction"
    on public.comment_reactions;

drop policy if exists "Users can delete own visible comment reaction"
    on public.comment_reactions;

create policy "Users can add own visible comment reaction"
    on public.comment_reactions
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and public.is_active_member()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );

create policy "Users can update own visible comment reaction"
    on public.comment_reactions
    for update
    to authenticated
    using (
        user_id = auth.uid()
        and public.is_active_member()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    )
    with check (
        user_id = auth.uid()
        and public.is_active_member()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );

create policy "Users can delete own visible comment reaction"
    on public.comment_reactions
    for delete
    to authenticated
    using (
        user_id = auth.uid()
        and public.is_active_member()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );
