-- NOTIFICATION CENTER 04
-- Read state for notifications about comments on a member's own Stories/files.

create table if not exists public.comment_notification_state (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    last_read_at timestamptz not null default now()
);

alter table public.comment_notification_state enable row level security;

revoke all on table public.comment_notification_state from anon;
grant select, insert, update on table public.comment_notification_state to authenticated;

drop policy if exists comment_notification_state_own_select
on public.comment_notification_state;

create policy comment_notification_state_own_select
on public.comment_notification_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists comment_notification_state_own_insert
on public.comment_notification_state;

create policy comment_notification_state_own_insert
on public.comment_notification_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists comment_notification_state_own_update
on public.comment_notification_state;

create policy comment_notification_state_own_update
on public.comment_notification_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
