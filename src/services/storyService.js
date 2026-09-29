const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const localStoriesUrl = 'http://localhost:3030/jsonstore/stories';

export async function fetchStories(options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=*&status=eq.published&order=display_order.asc`,
        {
            headers: {
                apikey: supabaseKey,
            },
            signal: options.signal,
        }
    );

    if (!response.ok) {
        throw new Error('Unable to load stories.');
    }

    const data = await response.json();

    return data.map((story) => ({
        ...story,
        _id: story.id,
    }));
}

export async function fetchStoryById(storyId, options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=*&id=eq.${encodeURIComponent(storyId)}&status=eq.published&limit=1`,
        {
            headers: {
                apikey: supabaseKey,
            },
            signal: options.signal,
        }
    );

    if (!response.ok) {
        throw new Error('Unable to load story details.');
    }

    const data = await response.json();
    const story = data[0];

    if (!story) {
        throw new Error('Story not found.');
    }

    return {
        ...story,
        _id: story.id,
    };
}

export async function createStory(storyData) {
    const response = await fetch(localStoriesUrl, {
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
    const response = await fetch(`${localStoriesUrl}/${storyId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Unable to delete story.');
    }
}
