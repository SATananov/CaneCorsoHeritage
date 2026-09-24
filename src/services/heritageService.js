const HERITAGE_PREVIEW_URL = '/data/heritage-preview.json';
const HERITAGE_ARTICLES_URL = '/data/heritage-articles.json';

async function fetchJson(url, errorMessage, options = {}) {
    const response = await fetch(url, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return response.json();
}

export function getHeritagePreview(options = {}) {
    return fetchJson(
        HERITAGE_PREVIEW_URL,
        'Unable to load heritage preview.',
        options,
    );
}

export async function getHeritageArticles(options = {}) {
    const articles = await fetchJson(
        HERITAGE_ARTICLES_URL,
        'Unable to load Heritage content library.',
        options,
    );

    if (!Array.isArray(articles)) {
        throw new Error('Heritage content library has an invalid format.');
    }

    return articles;
}
