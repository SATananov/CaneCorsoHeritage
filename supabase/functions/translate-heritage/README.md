# translate-heritage

Server-side translation for published project-owned Heritage content.

Required secrets:
- `DEEPL_API_KEY`
- optional `DEEPL_API_URL` (defaults to DeepL Free endpoint)

The function accepts `{ slugs: string[], targetLanguage: "en" | "bg" | "it" }`.
It translates only published `heritage_articles`, stores translations in
`heritage_translations`, and uses a SHA-256 source fingerprint so changed canonical
content is translated again instead of serving stale text.
