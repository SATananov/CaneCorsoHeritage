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

const STORY_COLUMNS = 'id,title,author_id,status,visibility,moderation_status,moderated_at,moderated_by,created_at';
const FILE_COLUMNS = 'id,user_id,story_id,file_name,storage_path,mime_type,file_size,visibility,moderation_status,moderated_at,moderated_by,created_at';

async function fetchExactCount(table, options) {
    let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
    if (options.signal) query = query.abortSignal(options.signal);
    const { count, error } = await query;

    if (error) {
        throw new Error(error.message || `Unable to count ${table}.`);
    }

    return count ?? 0;
}

async function fetchPendingRows(table, columns, options) {
    const rows = [];
    // The moderation queue must not inherit the recent-items limit or API row cap.
    for (;;) {
        let query = supabase.from(table).select(columns, { count: 'exact' })
            .eq('visibility', 'community')
            .eq('moderation_status', 'pending')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(rows.length, rows.length + 499);
        if (options.signal) query = query.abortSignal(options.signal);
        const { data, count, error } = await query;
        if (error) throw new Error(error.message || `Unable to load pending ${table}.`);
        if (!data?.length) return rows;
        rows.push(...data);
        if (count !== null && count !== undefined && rows.length >= count) return rows;
    }
}

async function getCurrentAdmin() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error('Administrator session is required.');
    }

    return data.user;
}

export async function fetchAdminDashboard(options = {}) {
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
        .select(STORY_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(50);

    let filesQuery = supabase
        .from('user_files')
        .select(FILE_COLUMNS)
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
        members,
        stories,
        files,
        storyRatings,
        fileRatings,
        pendingStories,
        pendingFiles,
    ] = await Promise.all([
        profilesQuery,
        rolesQuery,
        storiesQuery,
        filesQuery,
        storyRatingsQuery,
        fileRatingsQuery,
        fetchExactCount('profiles', options),
        fetchExactCount('stories', options),
        fetchExactCount('user_files', options),
        fetchExactCount('story_ratings', options),
        fetchExactCount('file_ratings', options),
        fetchPendingRows('stories', STORY_COLUMNS, options),
        fetchPendingRows('user_files', FILE_COLUMNS, options),
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
            pending: pendingStories.length + pendingFiles.length,
            pendingStories: pendingStories.length,
            pendingFiles: pendingFiles.length,
        },
        pendingStories,
        pendingFiles,
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
    const { count, error } = await supabase
        .from('stories')
        .update({
            moderation_status: moderationStatus,
            moderated_at: new Date().toISOString(),
            moderated_by: admin.id,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to moderate this Story.');
    }

    if (count !== 1) {
        throw new Error('Story moderation did not affect exactly one row.');
    }
}

export async function moderateFile(fileId, moderationStatus) {
    if (!MODERATION_STATUSES.has(moderationStatus) || moderationStatus === 'pending') {
        throw new Error('Unsupported file moderation status.');
    }

    const admin = await getCurrentAdmin();
    const { count, error } = await supabase
        .from('user_files')
        .update({
            moderation_status: moderationStatus,
            moderated_at: new Date().toISOString(),
            moderated_by: admin.id,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', fileId);

    if (error) {
        throw new Error(error.message || 'Unable to moderate this file.');
    }

    if (count !== 1) {
        throw new Error('File moderation did not affect exactly one row.');
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

    const { count, error } = await supabase
        .from('user_roles')
        .update({
            account_status: accountStatus,
        }, { count: 'exact' })
        .eq('user_id', userId);

    if (error) {
        throw new Error(error.message || 'Unable to update this member account.');
    }

    if (count !== 1) {
        throw new Error('Member account update did not affect exactly one row.');
    }
}

export async function adminDeleteFile(file) {
    if (!file?.id || !file.storage_path) {
        throw new Error('File metadata is incomplete.');
    }

    const { count: metadataCount, error: metadataError } = await supabase
        .from('user_files')
        .delete({ count: 'exact' })
        .eq('id', file.id);

    if (metadataError) {
        throw new Error(metadataError.message || 'Unable to delete the file record.');
    }

    if (metadataCount !== 1) {
        throw new Error('File deletion did not affect exactly one row.');
    }

    const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_path]);

    if (storageError) {
        throw new Error(storageError.message || 'File record was deleted, but the stored file could not be cleaned up.');
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

    const { count, error } = await supabase
        .from('stories')
        .delete({ count: 'exact' })
        .eq('id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to delete this Story.');
    }

    if (count !== 1) {
        throw new Error('Story deletion did not affect exactly one row.');
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
