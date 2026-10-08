-- Enforce parent Story privacy independently of client attachment synchronization.
-- Owner/admin read policies and standalone community file behavior stay intact.
alter policy "Public can read approved community user files"
    on public.user_files
    using (
        visibility = 'community'
        and moderation_status = 'approved'
        and (
            story_id is null
            or exists (
                select 1 from public.stories s
                where s.id = user_files.story_id
                  and s.status = 'published'
                  and s.visibility = 'community'
                  and s.moderation_status = 'approved'
            )
        )
    );

-- Preserve own-folder reads (including upload cleanup). Other reads require an
-- approved file and, for attachments, a publicly visible parent Story.
alter policy "user_files_storage_read"
    on storage.objects
    using (
        bucket_id = 'user-files'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
                select 1 from public.user_files uf
                where uf.storage_path = objects.name
                  and uf.visibility = 'community'
                  and uf.moderation_status = 'approved'
                  and (
                      uf.story_id is null
                      or exists (
                          select 1 from public.stories s
                          where s.id = uf.story_id
                            and s.status = 'published'
                            and s.visibility = 'community'
                            and s.moderation_status = 'approved'
                      )
                  )
            )
        )
    );

-- Existing RLS policies and admin_member_details() already use this helper.
-- CREATE OR REPLACE preserves its existing ownership and execution grants.
create or replace function public.is_admin() returns boolean
    language sql stable security definer
    set search_path to 'public', 'pg_temp'
    as $$
        select exists (
            select 1 from public.user_roles
            where user_id = auth.uid()
              and role = 'admin'
              and account_status = 'active'
        );
    $$;

-- These legacy Heritage policies also require profiles.role = 'admin'. Keep
-- that restriction and add the canonical active-admin check; do not broaden it.
alter policy "heritage_admin_delete" on storage.objects
    using (
        bucket_id = 'heritage' and public.is_admin()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );

alter policy "heritage_admin_insert" on storage.objects
    with check (
        bucket_id = 'heritage' and public.is_admin()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );

alter policy "heritage_admin_select" on storage.objects
    using (
        bucket_id = 'heritage' and public.is_admin()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );

alter policy "heritage_admin_update" on storage.objects
    using (
        bucket_id = 'heritage' and public.is_admin()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
    with check (
        bucket_id = 'heritage' and public.is_admin()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
