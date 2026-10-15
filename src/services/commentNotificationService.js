import { supabase } from '../lib/supabaseClient';

const PROFILE_COLUMNS = 'id,username,display_name';

function withAbortSignal(query, signal) {
    return signal ? query.abortSignal(signal) : query;
}

async function fetchProfiles(ids, options = {}) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) {
        return new Map();
    }

    let query = supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .in('id', uniqueIds);

    query = withAbortSignal(query, options.signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function fetchOwnedTargets(userId, options = {}) {
    let storyQuery = supabase
        .from('stories')
        .select('id,title')
        .eq('author_id', userId);

    let fileQuery = supabase
        .from('user_files')
        .select('id,file_name')
        .eq('user_id', userId);

    storyQuery = withAbortSignal(storyQuery, options.signal);
    fileQuery = withAbortSignal(fileQuery, options.signal);

    const [
        { data: stories, error: storyError },
        { data: files, error: fileError },
    ] = await Promise.all([storyQuery, fileQuery]);

    if (storyError) {
        throw storyError;
    }

    if (fileError) {
        throw fileError;
    }

    return {
        stories: stories || [],
        files: files || [],
    };
}

export async function fetchUnreadCommentNotifications(userId, options = {}) {
    if (!userId) {
        throw new Error('User id is required.');
    }

    const { stories, files } = await fetchOwnedTargets(userId, options);
    const storyIds = stories.map((story) => String(story.id));
    const fileIds = files.map((file) => String(file.id));

    if (storyIds.length === 0 && fileIds.length === 0) {
        return [];
    }

    const queries = [];

    if (storyIds.length > 0) {
        let query = supabase
            .from('comments')
            .select('id,target_type,target_id,author_id,content,created_at')
            .eq('target_type', 'story')
            .in('target_id', storyIds)
            .neq('author_id', userId)
            .order('created_at', { ascending: false });

        queries.push(withAbortSignal(query, options.signal));
    }

    if (fileIds.length > 0) {
        let query = supabase
            .from('comments')
            .select('id,target_type,target_id,author_id,content,created_at')
            .eq('target_type', 'file')
            .in('target_id', fileIds)
            .neq('author_id', userId)
            .order('created_at', { ascending: false });

        queries.push(withAbortSignal(query, options.signal));
    }

    const results = await Promise.all(queries);

    for (const result of results) {
        if (result.error) {
            throw result.error;
        }
    }

    const comments = results
        .flatMap((result) => result.data || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (comments.length === 0) {
        return [];
    }

    let readsQuery = supabase
        .from('comment_notification_reads')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', comments.map((comment) => comment.id));

    readsQuery = withAbortSignal(readsQuery, options.signal);

    const { data: readRows, error: readsError } = await readsQuery;

    if (readsError) {
        throw readsError;
    }

    const readIds = new Set((readRows || []).map((row) => row.comment_id));
    const unreadComments = comments.filter((comment) => !readIds.has(comment.id));

    if (unreadComments.length === 0) {
        return [];
    }

    const profileMap = await fetchProfiles(
        unreadComments.map((comment) => comment.author_id),
        options,
    );
    const storyMap = new Map(stories.map((story) => [String(story.id), story.title]));
    const fileMap = new Map(files.map((file) => [String(file.id), file.file_name]));

    return unreadComments.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.author_id) || {
            id: comment.author_id,
            username: '',
            display_name: '',
        },
        target_title: comment.target_type === 'story'
            ? storyMap.get(String(comment.target_id)) || ''
            : fileMap.get(String(comment.target_id)) || '',
    }));
}

export async function markCommentNotificationRead(userId, commentId) {
    if (!userId) {
        throw new Error('User id is required.');
    }

    if (!commentId) {
        throw new Error('Comment id is required.');
    }

    const { error } = await supabase
        .from('comment_notification_reads')
        .upsert(
            {
                user_id: userId,
                comment_id: commentId,
                read_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,comment_id' },
        );

    if (error) {
        throw error;
    }
}
