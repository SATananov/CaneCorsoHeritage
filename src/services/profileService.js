import { supabase } from '../lib/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export async function fetchProfiles(options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,display_name,username,avatar_url,avatar_path,bio,created_at,last_seen_at&order=display_name.asc`,
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
        `${supabaseUrl}/rest/v1/profiles?select=id,display_name,username,avatar_url,avatar_path,bio,created_at,updated_at,last_seen_at&id=eq.${encodeURIComponent(userId)}&limit=1`,
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

export async function fetchPublicContacts(options = {}) {
    let query = supabase
        .from('profile_public_contacts')
        .select('user_id,email,show_email,updated_at')
        .eq('show_email', true);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load public contact details.');
    }

    return data ?? [];
}

export async function fetchProfilePublicContact(userId, options = {}) {
    let query = supabase
        .from('profile_public_contacts')
        .select('user_id,email,show_email,updated_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load profile contact details.');
    }

    return data;
}


export async function fetchOwnPrivateProfileDetails(userId, options = {}) {
    let query = supabase
        .from('profile_private_details')
        .select('user_id,first_name,last_name,country,city,phone,updated_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (options.signal?.aborted) {
        return null;
    }

    if (error) {
        throw new Error(error.message || 'Unable to load private profile details.');
    }

    return data;
}

export async function saveOwnPrivateProfileDetails(
    userId,
    {
        firstName,
        lastName,
        country,
        city,
        phone,
    },
) {
    const { data, error } = await supabase
        .from('profile_private_details')
        .upsert({
            user_id: userId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            country: country.trim(),
            city: city.trim(),
            phone: phone.trim() || null,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id',
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message || 'Unable to update private profile details.');
    }

    return data;
}

export async function fetchPublishedStoriesByAuthor(userId, options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing.');
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/stories?select=id,eyebrow,title,description,created_at&author_id=eq.${encodeURIComponent(userId)}&status=eq.published&visibility=eq.community&moderation_status=eq.approved&order=created_at.desc`,
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

export async function updateOwnProfile(
    userId,
    {
        displayName,
        username,
        bio,
    },
) {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            display_name: displayName.trim() || null,
            username: username.trim().toLowerCase(),
            bio: bio.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id,display_name,username,avatar_url,avatar_path,bio,created_at,updated_at,last_seen_at')
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('This username is already in use.');
        }

        throw new Error(error.message || 'Unable to update your profile.');
    }

    return data;
}

export async function saveProfilePublicContact(
    userId,
    email,
    showEmail,
) {
    const cleanEmail = email.trim();

    const { data, error } = await supabase
        .from('profile_public_contacts')
        .upsert({
            user_id: userId,
            email: cleanEmail || null,
            show_email: Boolean(cleanEmail && showEmail),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id',
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message || 'Unable to update public contact settings.');
    }

    return data;
}

export async function uploadProfileAvatar(
    userId,
    file,
    previousAvatarPath,
) {
    if (!file?.type?.startsWith('image/')) {
        throw new Error('Please choose an image file.');
    }

    if (file.size > MAX_AVATAR_SIZE) {
        throw new Error('Avatar image must be 5 MB or smaller.');
    }

    const extension = file.name.includes('.')
        ? file.name.split('.').pop().toLowerCase()
        : 'jpg';
    const storagePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        throw new Error(uploadError.message || 'Unable to upload avatar.');
    }

    const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);

    const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .update({
            avatar_path: storagePath,
            avatar_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', userId);

    if (profileError || profileCount !== 1) {
        await supabase.storage.from('avatars').remove([storagePath]);
        throw new Error(profileError?.message || 'Unable to save avatar because the profile was not updated.');
    }

    if (previousAvatarPath && previousAvatarPath !== storagePath) {
        await supabase.storage.from('avatars').remove([previousAvatarPath]);
    }
}

export async function removeProfileAvatar(userId, avatarPath) {
    const { count, error } = await supabase
        .from('profiles')
        .update({
            avatar_path: null,
            avatar_url: null,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', userId);

    if (error) {
        throw new Error(error.message || 'Unable to remove avatar.');
    }

    if (count !== 1) {
        throw new Error('Avatar removal did not update the profile row.');
    }

    if (avatarPath) {
        const { error: storageError } = await supabase.storage
            .from('avatars')
            .remove([avatarPath]);

        if (storageError) {
            throw new Error(storageError.message || 'Avatar was removed from the profile, but the stored file could not be cleaned up.');
        }
    }
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
