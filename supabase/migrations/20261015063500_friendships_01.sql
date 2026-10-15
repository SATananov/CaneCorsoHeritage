-- FRIENDS 01
-- Private member-to-member friendship requests and accepted friendships.

create table if not exists public.friendships (
    id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.profiles(id) on delete cascade,
    addressee_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'pending'
        check (status in ('pending', 'accepted')),
    created_at timestamptz not null default now(),
    responded_at timestamptz,
    constraint friendships_not_self check (requester_id <> addressee_id),
    constraint friendships_response_state check (
        (status = 'pending' and responded_at is null)
        or (status = 'accepted' and responded_at is not null)
    )
);

create unique index if not exists friendships_unique_member_pair
on public.friendships (
    least(requester_id::text, addressee_id::text),
    greatest(requester_id::text, addressee_id::text)
);

create index if not exists friendships_requester_idx
on public.friendships (requester_id, status);

create index if not exists friendships_addressee_idx
on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

revoke all on table public.friendships from anon;
grant select, insert, update, delete on table public.friendships to authenticated;

drop policy if exists friendships_select_participants on public.friendships;
create policy friendships_select_participants
on public.friendships
for select
to authenticated
using (
    auth.uid() = requester_id
    or auth.uid() = addressee_id
);

drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester
on public.friendships
for insert
to authenticated
with check (
    auth.uid() = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
    and responded_at is null
);

drop policy if exists friendships_accept_addressee on public.friendships;
create policy friendships_accept_addressee
on public.friendships
for update
to authenticated
using (
    auth.uid() = addressee_id
    and status = 'pending'
)
with check (
    auth.uid() = addressee_id
    and status = 'accepted'
    and responded_at is not null
);

drop policy if exists friendships_delete_participants on public.friendships;
create policy friendships_delete_participants
on public.friendships
for delete
to authenticated
using (
    auth.uid() = requester_id
    or auth.uid() = addressee_id
);

create or replace function public.guard_friendship_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.id is distinct from old.id
       or new.requester_id is distinct from old.requester_id
       or new.addressee_id is distinct from old.addressee_id
       or new.created_at is distinct from old.created_at then
        raise exception 'Friendship identity fields cannot be changed.';
    end if;

    if old.status <> 'pending' or new.status <> 'accepted' then
        raise exception 'Only pending friend requests can be accepted.';
    end if;

    if new.responded_at is null then
        new.responded_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists guard_friendship_update on public.friendships;
create trigger guard_friendship_update
before update on public.friendships
for each row
execute function public.guard_friendship_update();
