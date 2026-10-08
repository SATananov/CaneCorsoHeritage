import { supabase } from '../lib/supabaseClient';
import { deleteStoryFiles } from './fileService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function checkSupabaseConfig() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }
}

async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        throw new Error('You need to be signed in.');
    }

    return data.session;
}

async function getReadHeaders() {
    const headers = {
        apikey: supabaseKey,
    };

    const { data } = await supabase.auth.getSession();

    if (data.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
    }

    return headers;
}

function getAuthHeaders(accessToken) {
    return {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };
}

function mapStory(story) {
    return {
        ...story,
        _id: story.id,
    };
}

export async function fetchStories(options = {}) {
    checkSupabaseConfig();

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=*&status=eq.published&visibility=eq.community&moderation_status=eq.approved&order=display_order.asc,created_at.desc`,
        {
            headers: {
                apikey: supabaseKey,
            },
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load stories.');
    }

    const data = await response.json();
    return data.map(mapStory);
}

export async function fetchStoryById(storyId, options = {}) {
    checkSupabaseConfig();

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=*&id=eq.${encodeURIComponent(storyId)}&status=eq.published&limit=1`,
        {
            headers: await getReadHeaders(),
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load story details.');
    }

    const data = await response.json();
    const story = data[0];

    if (!story) {
        throw new Error('Story not found.');
    }

    return mapStory(story);
}

export async function fetchMyStories(userId, options = {}) {
    checkSupabaseConfig();

    const session = await getSession();
    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=*&author_id=eq.${encodeURIComponent(userId)}&status=eq.published&order=created_at.desc`,
        {
            headers: getAuthHeaders(session.access_token),
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load your stories.');
    }

    const data = await response.json();
    return data.map(mapStory);
}

export async function createStory(storyData) {
    checkSupabaseConfig();

    const session = await getSession();
    const response = await fetch(`${supabaseUrl}/rest/v1/stories?select=*`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(session.access_token),
            Prefer: 'return=representation',
        },
        body: JSON.stringify({
            ...storyData,
            author_id: session.user.id,
            status: 'published',
            moderation_status: storyData.visibility === 'community' ? 'pending' : 'approved',
            moderated_at: null,
            moderated_by: null,
        }),
    });

    if (!response.ok) {
        throw new Error('Unable to create story.');
    }

    const data = await response.json();
    return mapStory(data[0]);
}

export async function updateStory(storyId, storyData) {
    checkSupabaseConfig();

    const session = await getSession();
    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?id=eq.${encodeURIComponent(storyId)}&author_id=eq.${encodeURIComponent(session.user.id)}&select=*`,
        {
            method: 'PATCH',
            headers: {
                ...getAuthHeaders(session.access_token),
                Prefer: 'return=representation',
            },
            body: JSON.stringify({
                ...storyData,
                author_id: session.user.id,
                status: 'published',
                moderation_status: storyData.visibility === 'community' ? 'pending' : 'approved',
                moderated_at: null,
                moderated_by: null,
                updated_at: new Date().toISOString(),
            }),
        },
    );

    if (!response.ok) {
        throw new Error('Unable to update story.');
    }

    const data = await response.json();

    if (!data[0]) {
        throw new Error('Story not found or not owned by this account.');
    }

    return mapStory(data[0]);
}

export async function deleteStory(storyId) {
    checkSupabaseConfig();

    const session = await getSession();
    await deleteStoryFiles(storyId);

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?id=eq.${encodeURIComponent(storyId)}&author_id=eq.${encodeURIComponent(session.user.id)}&select=id`,
        {
            method: 'DELETE',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${session.access_token}`,
                Prefer: 'return=representation',
            },
        },
    );

    if (!response.ok) {
        throw new Error('Unable to delete story.');
    }

    const data = await response.json();

    if (!data[0]) {
        throw new Error('Story not found or not owned by this account.');
    }
}
