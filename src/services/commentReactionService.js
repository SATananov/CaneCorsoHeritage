import { supabase } from '../lib/supabaseClient';

const VALID_REACTIONS = new Set(['like', 'dislike']);

function normalizeCommentId(commentId) {
    const cleanId = String(commentId ?? '').trim();

    if (!cleanId) {
        throw new Error('Comment id is required.');
    }

    return cleanId;
}

function normalizeReaction(reaction) {
    const cleanReaction = String(reaction ?? '').trim();

    if (!VALID_REACTIONS.has(cleanReaction)) {
        throw new Error('Unsupported comment reaction.');
    }

    return cleanReaction;
}

async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error('You need to be signed in.');
    }

    return data.user;
}

export async function fetchCommentReactions(commentIds, options = {}) {
    const ids = [...new Set(
        (commentIds ?? [])
            .map((id) => String(id ?? '').trim())
            .filter(Boolean),
    )];

    if (ids.length === 0) {
        return [];
    }

    let query = supabase
        .from('comment_reactions')
        .select('comment_id,user_id,reaction,created_at,updated_at')
        .in('comment_id', ids);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load comment reactions.');
    }

    return data ?? [];
}

export async function setCommentReaction(commentId, reaction) {
    const cleanCommentId = normalizeCommentId(commentId);
    const cleanReaction = normalizeReaction(reaction);
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from('comment_reactions')
        .upsert(
            {
                comment_id: cleanCommentId,
                user_id: user.id,
                reaction: cleanReaction,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'comment_id,user_id',
            },
        )
        .select('comment_id,user_id,reaction,created_at,updated_at')
        .single();

    if (error) {
        throw new Error(error.message || 'Unable to save comment reaction.');
    }

    return data;
}

export async function removeCommentReaction(commentId) {
    const cleanCommentId = normalizeCommentId(commentId);
    const user = await getCurrentUser();

    const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', cleanCommentId)
        .eq('user_id', user.id);

    if (error) {
        throw new Error(error.message || 'Unable to remove comment reaction.');
    }
}
