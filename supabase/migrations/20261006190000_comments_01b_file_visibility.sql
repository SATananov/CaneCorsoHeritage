-- COMMENTS 01B
-- File comments inherit visibility from public.user_files RLS.
-- Also aligns comment reaction access with comment visibility.

-- Extend comments target_type with "file".
do $$
declare
    constraint_name text;
begin
    select c.conname
    into constraint_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'comments'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%target_type%'
    limit 1;

    if constraint_name is not null then
        execute format(
            'alter table public.comments drop constraint %I',
            constraint_name
        );
    end if;
end
$$;

alter table public.comments
    add constraint comments_target_type_check
    check (target_type in ('story', 'heritage', 'file'));


-- Replace the broad public-read policy.
drop policy if exists "Comments are publicly readable"
    on public.comments;

create policy "Comments follow target visibility"
    on public.comments
    for select
    to anon, authenticated
    using (
        target_type = 'heritage'

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


-- New comments may only be created on a target
-- the current authenticated user can access.
drop policy if exists "Authenticated users can create own comments"
    on public.comments;

create policy "Authenticated users can create own visible-target comments"
    on public.comments
    for insert
    to authenticated
    with check (
        author_id = auth.uid()
        and (
            target_type = 'heritage'

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


-- Keep author-only update/delete.
drop policy if exists "Authors can update own comments"
    on public.comments;

create policy "Authors can update own comments"
    on public.comments
    for update
    to authenticated
    using (
        author_id = auth.uid()
    )
    with check (
        author_id = auth.uid()
    );

drop policy if exists "Authors can delete own comments"
    on public.comments;

create policy "Authors can delete own comments"
    on public.comments
    for delete
    to authenticated
    using (
        author_id = auth.uid()
    );


-- Reactions follow the visibility of their parent comment.
drop policy if exists "Comment reactions are publicly readable"
    on public.comment_reactions;

create policy "Comment reactions follow comment visibility"
    on public.comment_reactions
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );


drop policy if exists "Users can add own comment reaction"
    on public.comment_reactions;

create policy "Users can add own visible comment reaction"
    on public.comment_reactions
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );


drop policy if exists "Users can update own comment reaction"
    on public.comment_reactions;

create policy "Users can update own visible comment reaction"
    on public.comment_reactions
    for update
    to authenticated
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    )
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );


drop policy if exists "Users can delete own comment reaction"
    on public.comment_reactions;

create policy "Users can delete own visible comment reaction"
    on public.comment_reactions
    for delete
    to authenticated
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
        )
    );
