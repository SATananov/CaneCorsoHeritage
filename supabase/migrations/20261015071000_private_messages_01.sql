-- MESSAGES 01
-- Private one-to-one conversations between accepted friends.

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_one_id uuid not null references public.profiles(id) on delete cascade,
    user_two_id uuid not null references public.profiles(id) on delete cascade,
    created_by uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint conversations_two_members check (user_one_id <> user_two_id),
    constraint conversations_pair_order check (user_one_id::text < user_two_id::text),
    constraint conversations_creator_is_participant check (
        created_by = user_one_id or created_by = user_two_id
    ),
    constraint conversations_unique_pair unique (user_one_id, user_two_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (
        length(trim(body)) between 1 and 2000
    ),
    created_at timestamptz not null default now()
);

create index if not exists conversations_user_one_idx
on public.conversations (user_one_id, created_at desc);

create index if not exists conversations_user_two_idx
on public.conversations (user_two_id, created_at desc);

create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations from anon;
revoke all on table public.messages from anon;

grant select, insert on table public.conversations to authenticated;
grant select, insert on table public.messages to authenticated;

drop policy if exists conversations_participants_read on public.conversations;
create policy conversations_participants_read
on public.conversations
for select
to authenticated
using (
    auth.uid() = user_one_id
    or auth.uid() = user_two_id
);

drop policy if exists conversations_friends_create on public.conversations;
create policy conversations_friends_create
on public.conversations
for insert
to authenticated
with check (
    auth.uid() = created_by
    and (
        auth.uid() = user_one_id
        or auth.uid() = user_two_id
    )
    and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
              (f.requester_id = user_one_id and f.addressee_id = user_two_id)
              or
              (f.requester_id = user_two_id and f.addressee_id = user_one_id)
          )
    )
);

drop policy if exists messages_participants_read on public.messages;
create policy messages_participants_read
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.conversations c
        where c.id = messages.conversation_id
          and (
              auth.uid() = c.user_one_id
              or auth.uid() = c.user_two_id
          )
    )
);

drop policy if exists messages_friend_participants_insert on public.messages;
create policy messages_friend_participants_insert
on public.messages
for insert
to authenticated
with check (
    auth.uid() = sender_id
    and exists (
        select 1
        from public.conversations c
        where c.id = messages.conversation_id
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
