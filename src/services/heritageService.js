const HERITAGE_PREVIEW_URL = '/data/heritage-preview.json';

const HERITAGE_LIST_SELECT = [
    'slug',
    'title',
    'subtitle',
    'summary',
    'category',
    'content_type',
    'author',
    'story_by',
    'adaptation_by',
    'source_credit',
    'status',
    'featured',
    'display_order',
    'language',
    'cover_image',
    'published_at',
].join(',');

const HERITAGE_DETAILS_SELECT = [
    HERITAGE_LIST_SELECT,
    'content',
    'tags',
    'review_flags',
].join(',');

function getSupabaseConfig() {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '');
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!url || !publishableKey) {
        throw new Error('Supabase configuration is missing.');
    }

    return { url, publishableKey };
}

async function readErrorMessage(response, fallbackMessage) {
    try {
        const payload = await response.json();

        if (typeof payload?.message === 'string' && payload.message.trim()) {
            return `${fallbackMessage} ${payload.message.trim()}`;
        }
    } catch {
        // The fallback message remains the user-facing error.
    }

    return fallbackMessage;
}

async function fetchLocalJson(url, errorMessage, options = {}) {
    const response = await fetch(url, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return response.json();
}

async function fetchSupabaseJson(path, errorMessage, options = {}) {
    const { url, publishableKey } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/${path}`, {
        signal: options.signal,
        headers: {
            apikey: publishableKey,
        },
    });

    if (!response.ok) {
        const message = await readErrorMessage(response, errorMessage);
        throw new Error(message);
    }

    return response.json();
}

export function getHeritagePreview(options = {}) {
    return fetchLocalJson(
        HERITAGE_PREVIEW_URL,
        'Unable to load heritage preview.',
        options,
    );
}

export async function getHeritageArticles(options = {}) {
    const searchParams = new URLSearchParams({
        select: HERITAGE_LIST_SELECT,
        status: 'eq.published',
        order: 'display_order.asc',
    });

    const articles = await fetchSupabaseJson(
        `heritage_articles?${searchParams.toString()}`,
        'Unable to load published Heritage articles.',
        options,
    );

    if (!Array.isArray(articles)) {
        throw new Error('Published Heritage articles have an invalid format.');
    }

    return articles;
}

export async function getHeritageArticleBySlug(slug, options = {}) {
    const searchParams = new URLSearchParams({
        select: HERITAGE_DETAILS_SELECT,
        slug: `eq.${slug}`,
        status: 'eq.published',
        limit: '1',
    });

    const articles = await fetchSupabaseJson(
        `heritage_articles?${searchParams.toString()}`,
        'Unable to load this Heritage article.',
        options,
    );

    if (!Array.isArray(articles)) {
        throw new Error('Heritage article response has an invalid format.');
    }

    return articles[0] ?? null;
}
