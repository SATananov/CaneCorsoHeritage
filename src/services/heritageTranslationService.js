import { supabase } from '../lib/supabaseClient';

const SUPPORTED_LANGUAGES = ['en', 'bg', 'it'];
const DEFAULT_HERITAGE_SOURCE_LANGUAGE = 'en';

function assertLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error('Unsupported Heritage translation language.');
    }
}

function getHeritageSourceLanguage(article) {
    return SUPPORTED_LANGUAGES.includes(article?.language)
        ? article.language
        : DEFAULT_HERITAGE_SOURCE_LANGUAGE;
}

export async function fetchHeritageTranslations(slugs, language) {
    assertLanguage(language);

    const uniqueSlugs = [...new Set((slugs ?? []).filter(Boolean))];
    if (uniqueSlugs.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('heritage_translations')
        .select('heritage_slug, language, title, subtitle, summary, source_credit, content, source_fingerprint, provider, created_at, updated_at')
        .in('heritage_slug', uniqueSlugs)
        .eq('language', language);

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function requestHeritageTranslations(slugs, targetLanguage) {
    assertLanguage(targetLanguage);

    const uniqueSlugs = [...new Set((slugs ?? []).filter(Boolean))];
    if (uniqueSlugs.length === 0) {
        return [];
    }

    const { data, error } = await supabase.functions.invoke('translate-heritage', {
        body: {
            slugs: uniqueSlugs,
            targetLanguage,
        },
    });

    if (error) {
        throw error;
    }

    return Array.isArray(data?.translations) ? data.translations : [];
}

export function resolveHeritageArticle(article, translation) {
    if (!translation) {
        return article;
    }

    return {
        ...article,
        title: translation.title ?? article.title,
        subtitle: translation.subtitle ?? article.subtitle,
        summary: translation.summary ?? article.summary,
        source_credit: translation.source_credit ?? article.source_credit,
        content: translation.content ?? article.content,
        _translation: translation,
    };
}

export async function localizeHeritageArticles(articles, language) {
    const list = Array.isArray(articles) ? articles : [];
    const candidates = list.filter((article) => (
        article?.slug
        && getHeritageSourceLanguage(article) !== language
    ));

    if (candidates.length === 0) {
        return list;
    }

    const slugs = candidates.map((article) => article.slug);
    const translations = await requestHeritageTranslations(slugs, language)
        .catch(() => fetchHeritageTranslations(slugs, language))
        .catch(() => []);

    const translationsBySlug = new Map(
        translations.map((translation) => [translation.heritage_slug, translation]),
    );

    return list.map((article) => (
        resolveHeritageArticle(article, translationsBySlug.get(article.slug))
    ));
}
