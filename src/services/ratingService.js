import { supabase } from '../lib/supabaseClient';

export async function fetchStoryRatings(
    storyId,
    userId,
    options = {},
) {
    let query = supabase
        .from('story_ratings')
        .select('rating, user_id')
        .eq('story_id', storyId);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load Story ratings.');
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

export async function saveStoryRating(
    storyId,
    userId,
    rating,
    hasExistingRating,
) {
    if (hasExistingRating) {
        const { error } = await supabase
            .from('story_ratings')
            .update({
                rating,
                updated_at: new Date().toISOString(),
            })
            .eq('story_id', storyId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(error.message || 'Unable to update your rating.');
        }

        return;
    }

    const { error } = await supabase
        .from('story_ratings')
        .insert({
            story_id: storyId,
            user_id: userId,
            rating,
        });

    if (error) {
        throw new Error(error.message || 'Unable to save your rating.');
    }
}
