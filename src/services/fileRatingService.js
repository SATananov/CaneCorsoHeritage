import { supabase } from '../lib/supabaseClient';

export async function fetchFileRatings(
    fileId,
    userId,
    options = {},
) {
    let query = supabase
        .from('file_ratings')
        .select('rating, user_id')
        .eq('file_id', fileId);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load file ratings.');
    }

    const ratings = data ?? [];
    const count = ratings.length;
    const total = ratings.reduce(
        (sum, item) => sum + Number(item.rating),
        0,
    );
    const ownRating = userId
        ? ratings.find((item) => item.user_id === userId)
        : null;

    return {
        average: count > 0 ? total / count : 0,
        count,
        userRating: ownRating?.rating ?? 0,
    };
}

export async function saveFileRating(
    fileId,
    userId,
    rating,
    hasExistingRating,
) {
    if (hasExistingRating) {
        const { count, error } = await supabase
            .from('file_ratings')
            .update({
                rating,
                updated_at: new Date().toISOString(),
            }, { count: 'exact' })
            .eq('file_id', fileId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(error.message || 'Unable to update your rating.');
        }

        if (count !== 1) {
            throw new Error('Your rating no longer exists. Refresh and try again.');
        }

        return;
    }

    const { error } = await supabase
        .from('file_ratings')
        .insert({
            file_id: fileId,
            user_id: userId,
            rating,
        });

    if (error) {
        throw new Error(error.message || 'Unable to save your rating.');
    }
}
