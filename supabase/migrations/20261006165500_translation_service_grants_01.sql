-- TRANSLATION SERVICE GRANTS 01
-- Server-side Edge Functions use the service_role.
-- Canonical author/editorial content remains unchanged.

grant usage on schema public to service_role;

-- Canonical source tables: server-side read only.
grant select on table public.heritage_articles to service_role;
grant select on table public.stories to service_role;

-- Translation caches: server-side read/write.
grant select, insert, update, delete
on table public.heritage_translations
to service_role;

grant select, insert, update, delete
on table public.story_translations
to service_role;
