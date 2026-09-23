const HERITAGE_PREVIEW_URL = '/data/heritage-preview.json';
const HERITAGE_ARTICLES_URL = '/data/heritage-articles.json';

async function fetchJson(url, errorMessage) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return response.json();
}

export function getHeritagePreview() {
    return fetchJson(HERITAGE_PREVIEW_URL, 'Unable to load heritage preview.');
}

export async function getHeritageArticles() {
    const articles = await fetchJson(
        HERITAGE_ARTICLES_URL,
        'Unable to load Heritage content library.',
    );

    if (!Array.isArray(articles)) {
        throw new Error('Heritage content library has an invalid format.');
    }

    return articles;
}
