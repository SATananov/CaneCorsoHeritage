-- COMMENT REACTIONS 01
-- One reaction per user per comment.
-- Supported reactions: like / dislike.

create table if not exists public.comment_reactions (
    comment_id uuid not null
        references public.comments(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    reaction text not null
        check (reaction in ('like', 'dislike')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (comment_id, user_id)
);

create index if not exists comment_reactions_comment_idx
    on public.comment_reactions (comment_id);

create index if not exists comment_reactions_user_idx
    on public.comment_reactions (user_id);

alter table public.comment_reactions enable row level security;

drop policy if exists "Comment reactions are publicly readable"
    on public.comment_reactions;

create policy "Comment reactions are publicly readable"
    on public.comment_reactions
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.comments c
            where c.id = comment_reactions.comment_id
              and (
                  c.target_type = 'heritage'
                  or (
                      c.target_type = 'story'
                      and exists (
                          select 1
                          from public.stories s
                          where s.id = c.target_id
                            and s.status = 'published'
                            and s.visibility = 'community'
                            and s.moderation_status = 'approved'
                      )
                  )
              )
        )
    );

drop policy if exists "Users can add own comment reaction"
    on public.comment_reactions;

create policy "Users can add own comment reaction"
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

create policy "Users can update own comment reaction"
    on public.comment_reactions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Users can delete own comment reaction"
    on public.comment_reactions;

create policy "Users can delete own comment reaction"
    on public.comment_reactions
    for delete
    to authenticated
    using (user_id = auth.uid());

grant select on public.comment_reactions to anon;
grant select, insert, update, delete on public.comment_reactions to authenticated;
