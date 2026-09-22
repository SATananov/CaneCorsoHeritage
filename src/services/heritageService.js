const HERITAGE_PREVIEW_URL = '/data/heritage-preview.json';

export async function getHeritagePreview() {
    const response = await fetch(HERITAGE_PREVIEW_URL);

    if (!response.ok) {
        throw new Error('Unable to load heritage preview.');
    }

    return response.json();
}
