import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = new Set(['en', 'bg', 'it']);
const DEEPL_LANGUAGES: Record<string, string> = {
    en: 'EN',
    bg: 'BG',
    it: 'IT',
};
const MAX_ARTICLES_PER_REQUEST = 50;

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

async function sha256(value: unknown) {
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

function collectContentTexts(content: unknown) {
    if (!content || typeof content !== 'object') {
        return { texts: [] as string[], shape: null as unknown };
    }

    const sections = Array.isArray((content as { sections?: unknown[] }).sections)
        ? (content as { sections: unknown[] }).sections
        : [];
    const texts: string[] = [];
    const shape = sections.map((rawSection) => {
        const section = rawSection as { heading?: unknown; paragraphs?: unknown[] };
        const heading = typeof section.heading === 'string' ? section.heading : '';
        const paragraphs = Array.isArray(section.paragraphs)
            ? section.paragraphs.filter((item): item is string => typeof item === 'string')
            : [];

        texts.push(heading, ...paragraphs);
        return {
            paragraphCount: paragraphs.length,
        };
    });

    return { texts, shape };
}

function rebuildContent(shape: unknown, translations: string[]) {
    if (!Array.isArray(shape)) {
        return null;
    }

    let index = 0;
    return {
        sections: shape.map((rawSection) => {
            const section = rawSection as { paragraphCount?: number };
            const heading = translations[index++] ?? '';
            const paragraphCount = Number(section.paragraphCount ?? 0);
            const paragraphs = translations.slice(index, index + paragraphCount);
            index += paragraphCount;
            return { heading, paragraphs };
        }),
    };
}

async function translateTexts(
    texts: string[],
    sourceLanguage: string | null,
    targetLanguage: string,
    apiKey: string,
    apiUrl: string,
) {
    if (texts.length === 0) {
        return [];
    }

    const body: Record<string, unknown> = {
        text: texts,
        target_lang: DEEPL_LANGUAGES[targetLanguage],
        preserve_formatting: true,
    };

    if (sourceLanguage && DEEPL_LANGUAGES[sourceLanguage]) {
        body.source_lang = DEEPL_LANGUAGES[sourceLanguage];
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const providerMessage = await response.text();
        console.error('DeepL Heritage translation failed:', response.status, providerMessage);
        throw new Error('Translation provider failed.');
    }

    const payload = await response.json();
    const translations = payload?.translations;

    if (!Array.isArray(translations) || translations.length !== texts.length) {
        throw new Error('Translation provider returned an invalid response.');
    }

    return translations.map((translation) => translation.text as string);
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const deeplApiKey = Deno.env.get('DEEPL_API_KEY');
        const deeplApiUrl = Deno.env.get('DEEPL_API_URL') ?? 'https://api-free.deepl.com/v2/translate';

        if (!supabaseUrl || !serviceRoleKey || !deeplApiKey) {
            return json({ error: 'Translation service is not configured.' }, 500);
        }

        const body = await request.json();
        const targetLanguage = body?.targetLanguage;
        const slugs = Array.isArray(body?.slugs)
            ? [...new Set(body.slugs.filter((slug: unknown): slug is string => typeof slug === 'string' && slug.trim()))]
            : [];

        if (!SUPPORTED_LANGUAGES.has(targetLanguage) || slugs.length === 0) {
            return json({ error: 'Invalid Heritage translation request.' }, 400);
        }

        if (slugs.length > MAX_ARTICLES_PER_REQUEST) {
            return json({ error: 'Too many Heritage articles requested.' }, 400);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data: articles, error: articlesError } = await admin
            .from('heritage_articles')
            .select('slug, language, title, subtitle, summary, source_credit, content, status')
            .in('slug', slugs)
            .eq('status', 'published');

        if (articlesError) {
            console.error('Unable to load Heritage articles:', articlesError);
            return json({ error: 'Unable to load Heritage articles.' }, 500);
        }

        const result = [];

        for (const article of articles ?? []) {
            if (article.language === targetLanguage) {
                result.push({
                    heritage_slug: article.slug,
                    language: targetLanguage,
                    title: article.title,
                    subtitle: article.subtitle,
                    summary: article.summary,
                    source_credit: article.source_credit,
                    content: article.content,
                    source_fingerprint: 'original',
                    provider: 'original',
                });
                continue;
            }

            const sourceFingerprint = await sha256({
                language: article.language,
                title: article.title,
                subtitle: article.subtitle,
                summary: article.summary,
                source_credit: article.source_credit,
                content: article.content,
            });

            const { data: cached } = await admin
                .from('heritage_translations')
                .select('heritage_slug, language, title, subtitle, summary, source_credit, content, source_fingerprint, provider, created_at, updated_at')
                .eq('heritage_slug', article.slug)
                .eq('language', targetLanguage)
                .maybeSingle();

            if (cached?.source_fingerprint === sourceFingerprint) {
                result.push(cached);
                continue;
            }

            const { texts: contentTexts, shape } = collectContentTexts(article.content);
            const fixedTexts = [
                article.title ?? '',
                article.subtitle ?? '',
                article.summary ?? '',
                article.source_credit ?? '',
            ];
            const translated = await translateTexts(
                [...fixedTexts, ...contentTexts],
                article.language ?? null,
                targetLanguage,
                deeplApiKey,
                deeplApiUrl,
            );

            const translatedRow = {
                heritage_slug: article.slug,
                language: targetLanguage,
                title: translated[0] ?? article.title,
                subtitle: translated[1] || null,
                summary: translated[2] || null,
                source_credit: translated[3] || null,
                content: rebuildContent(shape, translated.slice(4)),
                source_fingerprint: sourceFingerprint,
                provider: 'deepl',
                updated_at: new Date().toISOString(),
            };

            const { data: saved, error: saveError } = await admin
                .from('heritage_translations')
                .upsert(translatedRow, { onConflict: 'heritage_slug,language' })
                .select('heritage_slug, language, title, subtitle, summary, source_credit, content, source_fingerprint, provider, created_at, updated_at')
                .single();

            if (saveError) {
                console.error('Unable to cache Heritage translation:', saveError);
                return json({ error: 'Unable to save Heritage translation.' }, 500);
            }

            result.push(saved);
        }

        return json({ translations: result });
    } catch (error) {
        console.error('translate-heritage error:', error);
        return json({ error: 'Unexpected Heritage translation error.' }, 500);
    }
});
