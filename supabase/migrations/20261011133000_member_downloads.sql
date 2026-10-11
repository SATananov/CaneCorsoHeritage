-- Keeps visibility and download permission independent.
-- Existing files default to download disabled for other members.

alter table public.user_files
    add column if not exists allow_member_download boolean not null default false;

comment on column public.user_files.allow_member_download is
    'When true, authenticated members may use the application download action for this file.';

-- Owners keep control of this value through the existing owner update policy.
-- Public visibility remains governed independently by visibility/moderation policies.
-- Storage preview/read policies are intentionally unchanged because public Gallery
-- previews still require access to approved Community media.
