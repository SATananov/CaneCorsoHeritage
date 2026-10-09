# translate-story Edge Function

Required secret:

- `DEEPL_API_KEY`

Optional secret:

- `DEEPL_API_URL` — defaults to `https://api-free.deepl.com/v2/translate`. Use `https://api.deepl.com/v2/translate` for DeepL API Pro.

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions.

Approved public Stories can be translated for guests as well as signed-in readers. Private or non-public Stories still require the Story owner to be authenticated. Cached translations remain readable according to the parent Story visibility rules.
