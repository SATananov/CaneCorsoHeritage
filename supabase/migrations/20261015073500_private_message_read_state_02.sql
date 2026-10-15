-- NOTIFICATIONS 02 / MESSAGE READ STATE
-- Per-participant read position for private conversations.

create table if not exists public.conversation_reads (
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create index if not exists conversation_reads_user_idx
on public.conversation_reads (user_id, last_read_at desc);

alter table public.conversation_reads enable row level security;

revoke all on table public.conversation_reads from anon;
grant select, insert, update on table public.conversation_reads to authenticated;

drop policy if exists conversation_reads_own_select on public.conversation_reads;
create policy conversation_reads_own_select
on public.conversation_reads
for select
to authenticated
using (
    auth.uid() = user_id
    and exists (
        select 1
        from public.conversations c
        where c.id = conversation_reads.conversation_id
          and (auth.uid() = c.user_one_id or auth.uid() = c.user_two_id)
    )
);

drop policy if exists conversation_reads_own_insert on public.conversation_reads;
create policy conversation_reads_own_insert
on public.conversation_reads
for insert
to authenticated
with check (
    auth.uid() = user_id
    and exists (
        select 1
        from public.conversations c
        where c.id = conversation_reads.conversation_id
          and (auth.uid() = c.user_one_id or auth.uid() = c.user_two_id)
    )
);

drop policy if exists conversation_reads_own_update on public.conversation_reads;
create policy conversation_reads_own_update
on public.conversation_reads
for update
to authenticated
using (
    auth.uid() = user_id
    and exists (
        select 1
        from public.conversations c
        where c.id = conversation_reads.conversation_id
          and (auth.uid() = c.user_one_id or auth.uid() = c.user_two_id)
    )
)
with check (
    auth.uid() = user_id
    and exists (
        select 1
        from public.conversations c
        where c.id = conversation_reads.conversation_id
          and (auth.uid() = c.user_one_id or auth.uid() = c.user_two_id)
    )
);
