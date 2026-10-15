-- NOTIFICATION CENTER 08
-- Engagement notifications: comment reactions + Story ratings + file ratings.
-- Existing historical rows are intentionally NOT backfilled.

create table if not exists public.notification_events (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    actor_id uuid not null references public.profiles(id) on delete cascade,
    type text not null
        check (type in ('comment_reaction', 'story_rating', 'file_rating')),
    source_key text not null,
    target_type text not null
        check (target_type in ('comment', 'story', 'file')),
    target_id text not null,
    context_type text,
    context_id text,
    target_label text,
    value text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    read_at timestamptz,
    unique (recipient_id, type, source_key)
);

create index if not exists notification_events_recipient_unread_idx
on public.notification_events (recipient_id, read_at, updated_at desc);

alter table public.notification_events enable row level security;

revoke all on table public.notification_events from anon;
revoke all on table public.notification_events from authenticated;
grant select, update on table public.notification_events to authenticated;

drop policy if exists notification_events_recipient_select
on public.notification_events;

create policy notification_events_recipient_select
on public.notification_events
for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists notification_events_recipient_update
on public.notification_events;

create policy notification_events_recipient_update
on public.notification_events
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create or replace function public.upsert_engagement_notification(
    p_recipient_id uuid,
    p_actor_id uuid,
    p_type text,
    p_source_key text,
    p_target_type text,
    p_target_id text,
    p_context_type text,
    p_context_id text,
    p_target_label text,
    p_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_recipient_id is null
       or p_actor_id is null
       or p_recipient_id = p_actor_id then
        return;
    end if;

    insert into public.notification_events (
        recipient_id,
        actor_id,
        type,
        source_key,
        target_type,
        target_id,
        context_type,
        context_id,
        target_label,
        value,
        created_at,
        updated_at,
        read_at
    )
    values (
        p_recipient_id,
        p_actor_id,
        p_type,
        p_source_key,
        p_target_type,
        p_target_id,
        p_context_type,
        p_context_id,
        p_target_label,
        p_value,
        now(),
        now(),
        null
    )
    on conflict (recipient_id, type, source_key)
    do update set
        actor_id = excluded.actor_id,
        target_type = excluded.target_type,
        target_id = excluded.target_id,
        context_type = excluded.context_type,
        context_id = excluded.context_id,
        target_label = excluded.target_label,
        value = excluded.value,
        updated_at = now(),
        read_at = null;
end;
$$;

revoke all on function public.upsert_engagement_notification(
    uuid, uuid, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

create or replace function public.notify_comment_reaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_author_id uuid;
    v_target_type text;
    v_target_id text;
    v_source_key text;
begin
    if tg_op = 'DELETE' then
        v_source_key := old.comment_id::text || ':' || old.user_id::text;

        delete from public.notification_events
        where type = 'comment_reaction'
          and source_key = v_source_key;

        return old;
    end if;

    select c.author_id, c.target_type, c.target_id
    into v_author_id, v_target_type, v_target_id
    from public.comments c
    where c.id = new.comment_id;

    v_source_key := new.comment_id::text || ':' || new.user_id::text;

    perform public.upsert_engagement_notification(
        v_author_id,
        new.user_id,
        'comment_reaction',
        v_source_key,
        'comment',
        new.comment_id::text,
        v_target_type,
        v_target_id,
        null,
        new.reaction
    );

    return new;
end;
$$;

create or replace function public.notify_story_rating_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid;
    v_title text;
begin
    if tg_op = 'DELETE' then
        delete from public.notification_events
        where type = 'story_rating'
          and source_key = old.id::text;

        return old;
    end if;

    select s.author_id, s.title
    into v_owner_id, v_title
    from public.stories s
    where s.id = new.story_id;

    perform public.upsert_engagement_notification(
        v_owner_id,
        new.user_id,
        'story_rating',
        new.id::text,
        'story',
        new.story_id,
        'story',
        new.story_id,
        v_title,
        new.rating::text
    );

    return new;
end;
$$;

create or replace function public.notify_file_rating_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid;
    v_file_name text;
begin
    if tg_op = 'DELETE' then
        delete from public.notification_events
        where type = 'file_rating'
          and source_key = old.id::text;

        return old;
    end if;

    select f.user_id, f.file_name
    into v_owner_id, v_file_name
    from public.user_files f
    where f.id = new.file_id;

    perform public.upsert_engagement_notification(
        v_owner_id,
        new.user_id,
        'file_rating',
        new.id::text,
        'file',
        new.file_id::text,
        'file',
        new.file_id::text,
        v_file_name,
        new.rating::text
    );

    return new;
end;
$$;

revoke all on function public.notify_comment_reaction_change()
from public, anon, authenticated;

revoke all on function public.notify_story_rating_change()
from public, anon, authenticated;

revoke all on function public.notify_file_rating_change()
from public, anon, authenticated;

drop trigger if exists notify_comment_reaction_change
on public.comment_reactions;

create trigger notify_comment_reaction_change
after insert or update or delete
on public.comment_reactions
for each row
execute function public.notify_comment_reaction_change();

drop trigger if exists notify_story_rating_change
on public.story_ratings;

create trigger notify_story_rating_change
after insert or update or delete
on public.story_ratings
for each row
execute function public.notify_story_rating_change();

drop trigger if exists notify_file_rating_change
on public.file_ratings;

create trigger notify_file_rating_change
after insert or update or delete
on public.file_ratings
for each row
execute function public.notify_file_rating_change();
