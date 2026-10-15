-- PRIVATE MESSAGE ATTACHMENTS 01
-- Private image/audio/video/document attachments for one-to-one messages.
-- Storage remains private; only accepted conversation participants may access objects.

alter table public.messages
    add column if not exists attachment_path text,
    add column if not exists attachment_name text,
    add column if not exists attachment_mime_type text,
    add column if not exists attachment_size bigint;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'messages_attachment_metadata_consistency'
          and conrelid = 'public.messages'::regclass
    ) then
        alter table public.messages
            add constraint messages_attachment_metadata_consistency
            check (
                (
                    attachment_path is null
                    and attachment_name is null
                    and attachment_mime_type is null
                    and attachment_size is null
                )
                or
                (
                    attachment_path is not null
                    and length(trim(attachment_path)) > 0
                    and attachment_name is not null
                    and length(trim(attachment_name)) between 1 and 255
                    and attachment_mime_type is not null
                    and length(trim(attachment_mime_type)) between 1 and 255
                    and attachment_size between 1 and 26214400
                )
            );
    end if;
end
$$;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'message-attachments',
    'message-attachments',
    false,
    26214400,
    array[
        'image/*',
        'audio/*',
        'video/*',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "message attachments participants read" on storage.objects;
create policy "message attachments participants read"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'message-attachments'
    and exists (
        select 1
        from public.conversations c
        where c.id::text = (storage.foldername(name))[1]
          and (
              auth.uid() = c.user_one_id
              or auth.uid() = c.user_two_id
          )
          and exists (
              select 1
              from public.friendships f
              where f.status = 'accepted'
                and (
                    (f.requester_id = c.user_one_id and f.addressee_id = c.user_two_id)
                    or
                    (f.requester_id = c.user_two_id and f.addressee_id = c.user_one_id)
                )
          )
    )
);

drop policy if exists "message attachments sender insert" on storage.objects;
create policy "message attachments sender insert"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
        select 1
        from public.conversations c
        where c.id::text = (storage.foldername(name))[1]
          and (
              auth.uid() = c.user_one_id
              or auth.uid() = c.user_two_id
          )
          and exists (
              select 1
              from public.friendships f
              where f.status = 'accepted'
                and (
                    (f.requester_id = c.user_one_id and f.addressee_id = c.user_two_id)
                    or
                    (f.requester_id = c.user_two_id and f.addressee_id = c.user_one_id)
                )
          )
    )
);

drop policy if exists "message attachments sender delete" on storage.objects;
create policy "message attachments sender delete"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
        select 1
        from public.conversations c
        where c.id::text = (storage.foldername(name))[1]
          and (
              auth.uid() = c.user_one_id
              or auth.uid() = c.user_two_id
          )
    )
);
