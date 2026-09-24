const STORIES_API_URL = 'http://localhost:3030/jsonstore/stories';

export async function fetchStories(options = {}) {
    const response = await fetch(STORIES_API_URL, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw new Error('Unable to load stories.');
    }

    const data = await response.json();

    return Object.values(data ?? {});
}

export async function fetchStoryById(storyId, options = {}) {
    const response = await fetch(`${STORIES_API_URL}/${storyId}`, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw new Error('Unable to load story details.');
    }

    return response.json();
}

export async function createStory(storyData) {
    const response = await fetch(STORIES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
    });

    if (!response.ok) {
        throw new Error('Unable to create story.');
    }

    return response.json();
}

export async function deleteStory(storyId) {
    const response = await fetch(`${STORIES_API_URL}/${storyId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Unable to delete story.');
    }
}
