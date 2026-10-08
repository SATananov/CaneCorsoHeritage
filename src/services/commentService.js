import { supabase } from '../lib/supabaseClient';

const VALID_TARGET_TYPES = new Set(['story', 'heritage', 'file']);
const MAX_COMMENT_LENGTH = 2000;

function normalizeTarget(targetType, targetId) {
    const cleanType = String(targetType ?? '').trim();
    const cleanId = String(targetId ?? '').trim();

    if (!VALID_TARGET_TYPES.has(cleanType)) {
        throw new Error('Unsupported comment target type.');
    }

    if (!cleanId) {
        throw new Error('Comment target id is required.');
    }

    return {
        targetType: cleanType,
        targetId: cleanId,
    };
}

function normalizeContent(content) {
    const cleanContent = String(content ?? '').trim();

    if (!cleanContent) {
        throw new Error('Comment cannot be empty.');
    }

    if (cleanContent.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Comment cannot be longer than ${MAX_COMMENT_LENGTH} characters.`);
    }

    return cleanContent;
}

async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error('You need to be signed in.');
    }

    return data.user;
}

export async function fetchComments(targetType, targetId, options = {}) {
    const target = normalizeTarget(targetType, targetId);

    let query = supabase
        .from('comments')
        .select('id,target_type,target_id,author_id,content,created_at,updated_at')
        .eq('target_type', target.targetType)
        .eq('target_id', target.targetId)
        .order('created_at', { ascending: true });

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load comments.');
    }

    return data ?? [];
}

export async function fetchCommentAuthorProfiles(authorIds, options = {}) {
    const uniqueIds = [...new Set(
        (authorIds ?? [])
            .map((id) => String(id ?? '').trim())
            .filter(Boolean),
    )];

    if (uniqueIds.length === 0) {
        return [];
    }

    let query = supabase
        .from('profiles')
        .select('id,display_name,username,avatar_url,avatar_path')
        .in('id', uniqueIds);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load comment authors.');
    }

    return data ?? [];
}

export async function createComment(targetType, targetId, content) {
    const target = normalizeTarget(targetType, targetId);
    const cleanContent = normalizeContent(content);
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from('comments')
        .insert({
            target_type: target.targetType,
            target_id: target.targetId,
            author_id: user.id,
            content: cleanContent,
        })
        .select('id,target_type,target_id,author_id,content,created_at,updated_at')
        .single();

    if (error) {
        throw new Error(error.message || 'Unable to add comment.');
    }

    return data;
}

export async function updateComment(commentId, content) {
    const cleanId = String(commentId ?? '').trim();
    const cleanContent = normalizeContent(content);

    if (!cleanId) {
        throw new Error('Comment id is required.');
    }

    await getCurrentUser();

    const { data, error } = await supabase
        .from('comments')
        .update({
            content: cleanContent,
            updated_at: new Date().toISOString(),
        })
        .eq('id', cleanId)
        .select('id,target_type,target_id,author_id,content,created_at,updated_at')
        .single();

    if (error) {
        throw new Error(error.message || 'Unable to update comment.');
    }

    return data;
}

export async function deleteComment(commentId) {
    const cleanId = String(commentId ?? '').trim();

    if (!cleanId) {
        throw new Error('Comment id is required.');
    }

    await getCurrentUser();

    const { count, error } = await supabase
        .from('comments')
        .delete({ count: 'exact' })
        .eq('id', cleanId);

    if (error) {
        throw new Error(error.message || 'Unable to delete comment.');
    }

    if (count !== 1) {
        throw new Error('Comment deletion did not affect exactly one row.');
    }
}
