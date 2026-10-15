-- NOTIFICATION CENTER 05
-- Per-comment read state so opening one notification does not clear all others.

create table if not exists public.comment_notification_reads (
    user_id uuid not null references public.profiles(id) on delete cascade,
    comment_id uuid not null references public.comments(id) on delete cascade,
    read_at timestamptz not null default now(),
    primary key (user_id, comment_id)
);

create index if not exists comment_notification_reads_user_idx
on public.comment_notification_reads (user_id, read_at desc);

alter table public.comment_notification_reads enable row level security;

revoke all on table public.comment_notification_reads from anon;
grant select, insert, update on table public.comment_notification_reads to authenticated;

drop policy if exists comment_notification_reads_own_select
on public.comment_notification_reads;

create policy comment_notification_reads_own_select
on public.comment_notification_reads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists comment_notification_reads_own_insert
on public.comment_notification_reads;

create policy comment_notification_reads_own_insert
on public.comment_notification_reads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists comment_notification_reads_own_update
on public.comment_notification_reads;

create policy comment_notification_reads_own_update
on public.comment_notification_reads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
