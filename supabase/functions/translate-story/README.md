# translate-story Edge Function

Required secret:

- `DEEPL_API_KEY`

Optional secret:

- `DEEPL_API_URL` — defaults to `https://api-free.deepl.com/v2/translate`. Use `https://api.deepl.com/v2/translate` for DeepL API Pro.

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions.

The function requires a signed-in user to create or refresh a machine translation. Public visitors can read already-cached translations through RLS but cannot spend translation quota.
