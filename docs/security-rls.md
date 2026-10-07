# Security / RLS Evidence

Verification date: **2026-10-07**

This document records read-only evidence from the connected Supabase database for the project's Row Level Security (RLS) configuration. It documents the deployed database state that was inspected; it does not assume that every deployed policy is represented by a migration file in this repository.

## Verification result

**Status: VERIFIED**

All application tables found in the `public` schema reported `rowsecurity = true`. Active policies were also inspected through PostgreSQL's `pg_policies` view.

| Table | RLS enabled | Policy evidence | Verified access intent |
| --- | --- | --- | --- |
| `comment_reactions` | yes | present | visible-comment reads; own authenticated create/update/delete |
| `comments` | yes | present | target-aware reads; authenticated own create; author/admin update/delete |
| `file_ratings` | yes | present | public eligible reads; active-member/own rating writes; admin read |
| `heritage_articles` | yes | present | public reads limited to published articles |
| `heritage_ratings` | yes | present | public reads; own authenticated rating writes; active-member guards |
| `heritage_translations` | yes | present | public translation reads |
| `profile_private_details` | yes | present | own private profile access; admin read |
| `profile_public_contacts` | yes | present | visibility-aware reads; own authenticated writes; active-member guard |
| `profiles` | yes | present | public profile reads; own update; admin read |
| `stories` | yes | present | approved community reads; own reads/writes; moderation guards; admin operations |
| `story_media` | yes | present | story-visibility reads; own-story media writes |
| `story_ratings` | yes | present | approved community rating reads; own rating writes; active-member guard; admin read |
| `story_translations` | yes | present | reads follow Story visibility and ownership |
| `user_files` | yes | present | approved community reads; own reads/writes; moderation guards; admin operations |
| `user_roles` | yes | present | own role read; admin read/update of member account status |

## Security model represented by the policies

The inspected policies demonstrate these backend authorization rules:

- Public access is limited to content intentionally exposed by the application, such as published Heritage content, approved Community Stories and approved Community files.
- Authenticated ownership checks use `auth.uid()` for user-owned records.
- Story and file mutations are constrained to their owners, while administrators have separate moderation capabilities.
- Community Story and file writes are protected by moderation-state guards.
- Ratings, comments and comment reactions use authenticated ownership rules and target-visibility checks.
- Profile-private data is restricted to its owner, with explicit administrator access where required.
- Role and account-status administration is restricted to administrators.
- Active-member checks are used on protected write paths where the application requires an active account.

React route guards and UI conditions remain an additional UX layer. The database RLS policies are the backend authorization boundary for direct client data access.

## Read-only verification queries

### 1. Confirm RLS is enabled on every public application table

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected verified result on 2026-10-07: every returned application table had `rowsecurity = true`.

### 2. Inspect active RLS policies

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

The policy output was reviewed for the 15 tables listed in the verification matrix above.

## Evidence scope

This evidence verifies the **deployed Supabase RLS state that was queried on 2026-10-07**. It does not claim that the repository's migration history alone is a complete reconstruction of every currently deployed policy. If the database schema or policies change later, these queries should be rerun and this document updated.
