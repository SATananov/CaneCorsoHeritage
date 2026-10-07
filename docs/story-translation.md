# USER STORY TRANSLATION 01 — Setup

This feature keeps the author's original Story unchanged and stores machine translations separately in Supabase.

## Runtime flow

1. The author chooses the original language when creating/editing a Story.
2. The Story is stored normally in `stories`; only `original_language` metadata is added.
3. A reader opens the Story in another UI language.
4. React first checks `story_translations` for a fresh cached translation.
5. If no fresh translation exists and the reader is signed in, React calls the `translate-story` Supabase Edge Function.
6. The Edge Function translates server-side and caches the result in `story_translations`.
7. The reader can switch between the machine translation and the author's original.

Public visitors can read already-cached translations. Only signed-in users can trigger a new translation, which protects translation quota from anonymous abuse.

## 1. Apply the database migration

Run the contents of:

`supabase/migrations/20261006152000_story_translation_01.sql`

in the Supabase SQL Editor for the CaneCorsoHeritage project.

This adds:

- `stories.original_language`
- `story_translations`
- indexes
- RLS that follows the parent Story visibility

No existing Story title, description or content is modified.

## 2. Configure the translation provider

The Edge Function currently uses DeepL. Add the secret only in Supabase; never put it in Vite `.env.local`.

Required Edge Function secret:

`DEEPL_API_KEY`

Optional:

`DEEPL_API_URL`

Default URL is the DeepL API Free endpoint:

`https://api-free.deepl.com/v2/translate`

For DeepL API Pro use:

`https://api.deepl.com/v2/translate`

## 3. Deploy the Edge Function

Deploy:

`supabase/functions/translate-story/index.ts`

as the Supabase Edge Function named:

`translate-story`

## 4. Verify the React project

From the project root:

```powershell
npm run verify:languages
npm run verify:story-translation
npm run lint
npm run build
```

## Compatibility note

Stories created before this feature do not have `original_language` metadata. They remain readable and unchanged. Opening an old Story in Edit and selecting its original language prepares it for automatic translation without rewriting the content.
