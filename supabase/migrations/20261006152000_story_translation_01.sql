-- USER STORY TRANSLATION 01
-- Keeps author content unchanged and stores machine translations separately.

alter table public.stories
    add column if not exists original_language text;

alter table public.stories
    drop constraint if exists stories_original_language_check;

alter table public.stories
    add constraint stories_original_language_check
    check (original_language is null or original_language in ('en', 'bg', 'it'));

create table if not exists public.story_translations (
    id uuid primary key default gen_random_uuid(),
    story_id text not null references public.stories(id) on delete cascade,
    language text not null check (language in ('en', 'bg', 'it')),
    title text not null,
    description text not null,
    content text not null,
    source_updated_at timestamptz not null,
    provider text not null default 'deepl',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (story_id, language)
);

create index if not exists story_translations_story_id_idx
    on public.story_translations(story_id);

create index if not exists story_translations_language_idx
    on public.story_translations(language);

alter table public.story_translations enable row level security;

grant select on public.story_translations to anon, authenticated;

-- Public approved Community translations are readable by everyone.
-- Private/non-public translations are readable only by their author.
drop policy if exists "story translations follow story visibility" on public.story_translations;
create policy "story translations follow story visibility"
on public.story_translations
for select
using (
    exists (
        select 1
        from public.stories s
        where s.id = story_translations.story_id
          and s.status = 'published'
          and (
              (s.visibility = 'community' and s.moderation_status = 'approved')
              or s.author_id = auth.uid()
          )
    )
);

-- Intentionally no client INSERT/UPDATE/DELETE policy.
-- Translation writes go only through the server-side Edge Function using the service role.
