# CONTENT LOCALIZATION ARCHITECTURE 01

## Goal
The selected EN / BG / IT language controls both application UI and readable content without overwriting canonical author text.

## Content rules
- UI copy: local `translations.js`.
- Project-owned Heritage content: canonical `heritage_articles` + separate cached `heritage_translations`.
- User Stories: canonical `stories` + separate cached `story_translations`.
- Author names and identity metadata are not translated.
- If translation is unavailable, the original content remains visible.

## Supabase migration
Run:

`supabase/migrations/20261006160000_content_localization_01.sql`

This creates the public read-only `heritage_translations` cache with RLS. Browser clients receive SELECT only. Writes are Edge Function service-role only.

## Edge Functions
Deploy/update:

- `translate-story` (updated so approved public Stories can be translated for guests; private content still requires the owner)
- `translate-heritage` (new; only published Heritage articles; validates source fingerprints)

Required secret:

- `DEEPL_API_KEY`

Optional:

- `DEEPL_API_URL` (defaults to `https://api-free.deepl.com/v2/translate`)

## Runtime behavior
### Stories
Public Story cards and Story details resolve the selected language. New Stories keep the explicit original language selected by the author. For older Stories without `original_language`, the translation flow currently falls back to `en` as the source language rather than relying on provider language detection.

### Heritage
Heritage catalog cards and article bodies resolve EN/BG/IT through the server-side cache. If canonical Heritage content changes, a SHA-256 source fingerprint causes regeneration instead of serving stale content.

### Fallback
Translation errors never overwrite source content. React falls back to the canonical article/story.

## Local verification

```powershell
npm run lint
npm run verify:languages
npm run verify:story-translation
npm run verify:content-localization
npm run build
```
