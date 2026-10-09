import { supabase } from '../lib/supabaseClient';

function createEmptyMetrics() {
    return {
        averageRating: 0,
        ratingCount: 0,
        commentCount: 0,
    };
}

export async function enrichStoriesWithCatalogMetrics(stories, options = {}) {
    const sourceStories = Array.isArray(stories) ? stories : [];
    const storyIds = [...new Set(
        sourceStories
            .map((story) => String(story?.id ?? story?._id ?? '').trim())
            .filter(Boolean),
    )];

    if (storyIds.length === 0) {
        return sourceStories.map((story) => ({
            ...story,
            ...createEmptyMetrics(),
            metricsWarning: false,
        }));
    }

    let ratingsQuery = supabase
        .from('story_ratings')
        .select('story_id,rating')
        .in('story_id', storyIds);

    let commentsQuery = supabase
        .from('comments')
        .select('target_id')
        .eq('target_type', 'story')
        .in('target_id', storyIds);

    if (options.signal) {
        ratingsQuery = ratingsQuery.abortSignal(options.signal);
        commentsQuery = commentsQuery.abortSignal(options.signal);
    }

    const [ratingsResult, commentsResult] = await Promise.all([
        ratingsQuery,
        commentsQuery,
    ]);

    const ratingsAvailable = !ratingsResult.error;
    const commentsAvailable = !commentsResult.error;

    const ratingRows = ratingsAvailable
        ? (ratingsResult.data ?? [])
        : [];

    const commentRows = commentsAvailable
        ? (commentsResult.data ?? [])
        : [];

    const metricsByStoryId = new Map(
        storyIds.map((storyId) => [
            storyId,
            {
                averageRating: ratingsAvailable ? 0 : null,
                ratingCount: ratingsAvailable ? 0 : null,
                commentCount: commentsAvailable ? 0 : null,
                metricsWarning: !ratingsAvailable || !commentsAvailable,
            },
        ]),
    );

    for (const ratingRow of ratingRows) {
        const storyId = String(ratingRow.story_id ?? '').trim();
        const metrics = metricsByStoryId.get(storyId);

        if (!metrics) {
            continue;
        }

        metrics.ratingCount += 1;
        metrics.averageRating += Number(ratingRow.rating) || 0;
    }

    for (const metrics of metricsByStoryId.values()) {
        if (metrics.ratingCount > 0) {
            metrics.averageRating /= metrics.ratingCount;
        }
    }

    for (const commentRow of commentRows) {
        const storyId = String(commentRow.target_id ?? '').trim();
        const metrics = metricsByStoryId.get(storyId);

        if (metrics) {
            metrics.commentCount += 1;
        }
    }

    return sourceStories.map((story) => {
        const storyId = String(story?.id ?? story?._id ?? '').trim();

        return {
            ...story,
            ...(metricsByStoryId.get(storyId) ?? {
                ...createEmptyMetrics(),
                metricsWarning: false,
            }),
        };
    });
}
