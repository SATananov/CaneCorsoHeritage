-- COMMENTS 01A
-- Public read, authenticated create, author-only update/delete.

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    target_type text not null
        check (target_type in ('story', 'heritage')),
    target_id text not null,
    author_id uuid not null
        references auth.users(id) on delete cascade,
    content text not null
        check (
            char_length(btrim(content)) > 0
            and char_length(content) <= 2000
        ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists comments_target_idx
    on public.comments (target_type, target_id, created_at);

create index if not exists comments_author_idx
    on public.comments (author_id);

alter table public.comments enable row level security;

drop policy if exists "Comments are publicly readable"
    on public.comments;

create policy "Comments are publicly readable"
    on public.comments
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Authenticated users can create own comments"
    on public.comments;

create policy "Authenticated users can create own comments"
    on public.comments
    for insert
    to authenticated
    with check (author_id = auth.uid());

drop policy if exists "Authors can update own comments"
    on public.comments;

create policy "Authors can update own comments"
    on public.comments
    for update
    to authenticated
    using (author_id = auth.uid())
    with check (author_id = auth.uid());

drop policy if exists "Authors can delete own comments"
    on public.comments;

create policy "Authors can delete own comments"
    on public.comments
    for delete
    to authenticated
    using (author_id = auth.uid());

grant select on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;

