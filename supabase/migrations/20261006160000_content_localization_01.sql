-- CONTENT LOCALIZATION ARCHITECTURE 01
-- Official Heritage translations are cached separately from canonical content.

create table if not exists public.heritage_translations (
    id uuid primary key default gen_random_uuid(),
    heritage_slug text not null,
    language text not null check (language in ('en', 'bg', 'it')),
    title text not null,
    subtitle text,
    summary text,
    source_credit text,
    content jsonb,
    source_fingerprint text not null,
    provider text not null default 'deepl',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (heritage_slug, language)
);

create index if not exists heritage_translations_slug_idx
    on public.heritage_translations(heritage_slug);

create index if not exists heritage_translations_language_idx
    on public.heritage_translations(language);

alter table public.heritage_translations enable row level security;

grant select on public.heritage_translations to anon, authenticated;

-- Heritage translations are public read-only presentation data.
drop policy if exists "heritage translations are public readable" on public.heritage_translations;
create policy "heritage translations are public readable"
on public.heritage_translations
for select
using (true);

-- Intentionally no client INSERT / UPDATE / DELETE policy.
-- The translate-heritage Edge Function writes with the service role.
