-- INACTIVE SOCIAL RLS 01
-- Align Friends / Private Messages backend authorization with the React active-account gate.
-- Applied migrations remain immutable: this migration only adds restrictive policies.
--
-- Active members keep the existing participant/friendship permissions.
-- Admins preserve the same active-member-or-admin convention used elsewhere in the project.
-- Inactive authenticated users cannot read or mutate Friends / Messaging data, read-state rows,
-- or objects in the private message-attachments bucket.

-- ---------------------------------------------------------------------------
-- FRIENDSHIPS
-- ---------------------------------------------------------------------------

drop policy if exists "active members can use friendships"
on public.friendships;

create policy "active members can use friendships"
on public.friendships
as restrictive
for all
to authenticated
using (
    public.is_active_member()
    or public.is_admin()
)
with check (
    public.is_active_member()
    or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- CONVERSATIONS
-- ---------------------------------------------------------------------------

drop policy if exists "active members can use conversations"
on public.conversations;

create policy "active members can use conversations"
on public.conversations
as restrictive
for all
to authenticated
using (
    public.is_active_member()
    or public.is_admin()
)
with check (
    public.is_active_member()
    or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- MESSAGES
-- ---------------------------------------------------------------------------

drop policy if exists "active members can use private messages"
on public.messages;

create policy "active members can use private messages"
on public.messages
as restrictive
for all
to authenticated
using (
    public.is_active_member()
    or public.is_admin()
)
with check (
    public.is_active_member()
    or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- CONVERSATION READ STATE
-- ---------------------------------------------------------------------------

drop policy if exists "active members can use conversation reads"
on public.conversation_reads;

create policy "active members can use conversation reads"
on public.conversation_reads
as restrictive
for all
to authenticated
using (
    public.is_active_member()
    or public.is_admin()
)
with check (
    public.is_active_member()
    or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- PRIVATE MESSAGE ATTACHMENTS
-- ---------------------------------------------------------------------------
-- storage.objects is shared by multiple buckets. The policy is therefore true
-- for every other bucket and applies active-account enforcement only to
-- message-attachments. Existing participant/friendship/sender policies remain
-- authoritative and are ANDed with this restrictive policy.

drop policy if exists "active members can use message attachments"
on storage.objects;

create policy "active members can use message attachments"
on storage.objects
as restrictive
for all
to authenticated
using (
    bucket_id <> 'message-attachments'
    or public.is_active_member()
    or public.is_admin()
)
with check (
    bucket_id <> 'message-attachments'
    or public.is_active_member()
    or public.is_admin()
);
