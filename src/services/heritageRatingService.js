import { supabase } from '../lib/supabaseClient';

export async function fetchHeritageRatings(
    articleSlug,
    userId,
    options = {},
) {
    let query = supabase
        .from('heritage_ratings')
        .select('rating, user_id')
        .eq('article_slug', articleSlug);

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load Heritage ratings.');
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

export async function saveHeritageRating(
    articleSlug,
    userId,
    rating,
    hasExistingRating,
) {
    if (hasExistingRating) {
        const { count, error } = await supabase
            .from('heritage_ratings')
            .update({
                rating,
                updated_at: new Date().toISOString(),
            }, { count: 'exact' })
            .eq('article_slug', articleSlug)
            .eq('user_id', userId);

        if (error) {
            throw new Error(error.message || 'Unable to update your Heritage rating.');
        }

        if (count !== 1) {
            throw new Error('Your Heritage rating no longer exists. Refresh and try again.');
        }

        return;
    }

    const { error } = await supabase
        .from('heritage_ratings')
        .insert({
            article_slug: articleSlug,
            user_id: userId,
            rating,
        });

    if (error) {
        throw new Error(error.message || 'Unable to save your Heritage rating.');
    }
}
