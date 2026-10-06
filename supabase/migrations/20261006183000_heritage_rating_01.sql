-- HERITAGE RATING 01
-- One rating per user per Heritage article.

create table if not exists public.heritage_ratings (
    article_slug text not null,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    rating integer not null
        check (rating between 1 and 5),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (article_slug, user_id)
);

create index if not exists heritage_ratings_article_idx
    on public.heritage_ratings (article_slug);

create index if not exists heritage_ratings_user_idx
    on public.heritage_ratings (user_id);

alter table public.heritage_ratings enable row level security;

drop policy if exists "Heritage ratings are publicly readable"
    on public.heritage_ratings;

create policy "Heritage ratings are publicly readable"
    on public.heritage_ratings
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Users can create own Heritage rating"
    on public.heritage_ratings;

create policy "Users can create own Heritage rating"
    on public.heritage_ratings
    for insert
    to authenticated
    with check (user_id = auth.uid());

drop policy if exists "Users can update own Heritage rating"
    on public.heritage_ratings;

create policy "Users can update own Heritage rating"
    on public.heritage_ratings
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Users can delete own Heritage rating"
    on public.heritage_ratings;

create policy "Users can delete own Heritage rating"
    on public.heritage_ratings
    for delete
    to authenticated
    using (user_id = auth.uid());

grant select on public.heritage_ratings to anon;
grant select, insert, update, delete on public.heritage_ratings to authenticated;
