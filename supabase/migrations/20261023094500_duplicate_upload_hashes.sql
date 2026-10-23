alter table public.user_files
    add column if not exists content_hash text;

create index if not exists user_files_user_content_hash_idx
    on public.user_files (user_id, content_hash)
    where content_hash is not null;

alter table public.messages
    add column if not exists attachment_hash text;

create index if not exists messages_sender_attachment_hash_idx
    on public.messages (sender_id, attachment_hash)
    where attachment_hash is not null;
