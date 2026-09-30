import { supabase } from '../lib/supabaseClient';

const MODERATION_STATUSES = new Set([
    'pending',
    'approved',
    'rejected',
    'hidden',
]);

const ACCOUNT_STATUSES = new Set([
    'active',
    'inactive',
]);

async function fetchExactCount(table) {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

    if (error) {
        throw new Error(error.message || `Unable to count ${table}.`);
    }

    return count ?? 0;
}

async function fetchPendingCount(table) {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('visibility', 'community')
        .eq('moderation_status', 'pending');

    if (error) {
        throw new Error(error.message || `Unable to count pending ${table}.`);
    }

    return count ?? 0;
}

async function getCurrentAdmin() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error('Administrator session is required.');
    }

    return data.user;
}

export async function fetchAdminDashboard(options = {}) {
    const [
        members,
        stories,
        files,
        storyRatings,
        fileRatings,
        pendingStories,
        pendingFiles,
    ] = await Promise.all([
        fetchExactCount('profiles'),
        fetchExactCount('stories'),
        fetchExactCount('user_files'),
        fetchExactCount('story_ratings'),
        fetchExactCount('file_ratings'),
        fetchPendingCount('stories'),
        fetchPendingCount('user_files'),
    ]);

    let profilesQuery = supabase
        .from('profiles')
        .select('id,display_name,username,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    let rolesQuery = supabase
        .from('user_roles')
        .select('user_id,role,account_status')
        .limit(100);

    let storiesQuery = supabase
        .from('stories')
        .select('id,title,author_id,status,visibility,moderation_status,moderated_at,moderated_by,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    let filesQuery = supabase
        .from('user_files')
        .select('id,user_id,story_id,file_name,storage_path,mime_type,file_size,visibility,moderation_status,moderated_at,moderated_by,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    let storyRatingsQuery = supabase
        .from('story_ratings')
        .select('story_id,user_id,rating')
        .limit(50);

    let fileRatingsQuery = supabase
        .from('file_ratings')
        .select('file_id,user_id,rating')
        .limit(50);

    if (options.signal) {
        profilesQuery = profilesQuery.abortSignal(options.signal);
        rolesQuery = rolesQuery.abortSignal(options.signal);
        storiesQuery = storiesQuery.abortSignal(options.signal);
        filesQuery = filesQuery.abortSignal(options.signal);
        storyRatingsQuery = storyRatingsQuery.abortSignal(options.signal);
        fileRatingsQuery = fileRatingsQuery.abortSignal(options.signal);
    }

    const [
        profilesResult,
        rolesResult,
        storiesResult,
        filesResult,
        storyRatingsResult,
        fileRatingsResult,
    ] = await Promise.all([
        profilesQuery,
        rolesQuery,
        storiesQuery,
        filesQuery,
        storyRatingsQuery,
        fileRatingsQuery,
    ]);

    const results = [
        ['members', profilesResult],
        ['roles', rolesResult],
        ['stories', storiesResult],
        ['files', filesResult],
        ['story ratings', storyRatingsResult],
        ['file ratings', fileRatingsResult],
    ];

    for (const [label, result] of results) {
        if (result.error) {
            throw new Error(result.error.message || `Unable to load ${label}.`);
        }
    }

    return {
        counts: {
            members,
            stories,
            files,
            ratings: storyRatings + fileRatings,
            pending: pendingStories + pendingFiles,
            pendingStories,
            pendingFiles,
        },
        profiles: profilesResult.data ?? [],
        roles: rolesResult.data ?? [],
        stories: storiesResult.data ?? [],
        files: filesResult.data ?? [],
        storyRatings: storyRatingsResult.data ?? [],
        fileRatings: fileRatingsResult.data ?? [],
    };
}

export async function moderateStory(storyId, moderationStatus) {
    if (!MODERATION_STATUSES.has(moderationStatus) || moderationStatus === 'pending') {
        throw new Error('Unsupported Story moderation status.');
    }

    const admin = await getCurrentAdmin();
    const { error } = await supabase
        .from('stories')
        .update({
            moderation_status: moderationStatus,
            moderated_at: new Date().toISOString(),
            moderated_by: admin.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to moderate this Story.');
    }
}

export async function moderateFile(fileId, moderationStatus) {
    if (!MODERATION_STATUSES.has(moderationStatus) || moderationStatus === 'pending') {
        throw new Error('Unsupported file moderation status.');
    }

    const admin = await getCurrentAdmin();
    const { error } = await supabase
        .from('user_files')
        .update({
            moderation_status: moderationStatus,
            moderated_at: new Date().toISOString(),
            moderated_by: admin.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

    if (error) {
        throw new Error(error.message || 'Unable to moderate this file.');
    }
}

export async function setMemberAccountStatus(userId, accountStatus) {
    if (!ACCOUNT_STATUSES.has(accountStatus)) {
        throw new Error('Unsupported account status.');
    }

    const admin = await getCurrentAdmin();

    if (admin.id === userId) {
        throw new Error('The current administrator account cannot be deactivated.');
    }

    const { error } = await supabase
        .from('user_roles')
        .update({
            account_status: accountStatus,
        })
        .eq('user_id', userId);

    if (error) {
        throw new Error(error.message || 'Unable to update this member account.');
    }
}

export async function adminDeleteFile(file) {
    if (!file?.id || !file.storage_path) {
        throw new Error('File metadata is incomplete.');
    }

    const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_path]);

    if (storageError) {
        throw new Error(storageError.message || 'Unable to remove the stored file.');
    }

    const { error: metadataError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', file.id);

    if (metadataError) {
        throw new Error(metadataError.message || 'Unable to delete the file record.');
    }
}

export async function adminDeleteStory(storyId) {
    const { data: files, error: filesError } = await supabase
        .from('user_files')
        .select('id,storage_path')
        .eq('story_id', storyId);

    if (filesError) {
        throw new Error(filesError.message || 'Unable to prepare Story files for deletion.');
    }

    const storagePaths = (files ?? [])
        .map((file) => file.storage_path)
        .filter(Boolean);

    if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
            .from('user-files')
            .remove(storagePaths);

        if (storageError) {
            throw new Error(storageError.message || 'Unable to remove Story files.');
        }

        const { error: fileMetadataError } = await supabase
            .from('user_files')
            .delete()
            .eq('story_id', storyId);

        if (fileMetadataError) {
            throw new Error(fileMetadataError.message || 'Unable to remove Story file records.');
        }
    }

    const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to delete this Story.');
    }
}

export async function fetchAdminMemberDetails(userId) {
    if (!userId) {
        throw new Error('Member id is required.');
    }

    const { data, error } = await supabase.rpc('admin_member_details', {
        target_user_id: userId,
    });

    if (error) {
        throw new Error(error.message || 'Unable to load member details.');
    }

    return Array.isArray(data) ? (data[0] ?? null) : data;
}
