alter table public.stories
    add column if not exists editorial_source text;

comment on column public.stories.editorial_source is
    'Optional editorial/platform provenance used when a Story does not belong to a linked member profile.';

update public.stories as s
set editorial_source = 'USG — Unico Suo Genere'
where s.editorial_source is null
  and not exists (
      select 1
      from public.profiles as p
      where p.id = s.author_id
  );
