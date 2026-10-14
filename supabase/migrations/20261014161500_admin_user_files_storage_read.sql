-- Allow active administrators to preview user-file storage objects while
-- moderating pending uploads. This does not make the objects public; access
-- is still restricted to authenticated users who satisfy public.is_admin().

drop policy if exists "admins can read all user file storage" on storage.objects;

create policy "admins can read all user file storage"
    on storage.objects
    for select
    to authenticated
    using (
        bucket_id = 'user-files'
        and public.is_admin()
    );
