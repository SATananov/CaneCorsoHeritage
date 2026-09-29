const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function fetchProfiles(options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,display_name,avatar_url,avatar_path,bio,created_at,last_seen_at&order=display_name.asc`,
        {
            headers: { apikey: supabaseKey },
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load members.');
    }

    return response.json();
}

export async function fetchProfileById(userId, options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,display_name,avatar_url,avatar_path,bio,created_at,last_seen_at&id=eq.${encodeURIComponent(userId)}&limit=1`,
        {
            headers: { apikey: supabaseKey },
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load this member.');
    }

    const data = await response.json();
    return data[0] ?? null;
}

export async function fetchPublishedStoriesByAuthor(userId, options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=id,eyebrow,title,description,created_at&author_id=eq.${encodeURIComponent(userId)}&status=eq.published&order=created_at.desc`,
        {
            headers: { apikey: supabaseKey },
            signal: options.signal,
        },
    );

    if (!response.ok) {
        throw new Error('Unable to load published stories.');
    }

    return response.json();
}

export function getProfileAvatarUrl(profile) {
    const directUrl = profile?.avatar_url?.trim();

    if (directUrl) {
        if (/^https?:\/\//i.test(directUrl)) {
            return directUrl;
        }

        return `${supabaseUrl}/storage/v1/object/public/avatars/${directUrl.replace(/^\/+/, '')}`;
    }

    const avatarPath = profile?.avatar_path?.trim();

    if (!avatarPath || !supabaseUrl) {
        return '';
    }

    return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarPath.replace(/^\/+/, '')}`;
}
