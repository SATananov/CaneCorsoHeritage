import { supabase } from '../lib/supabaseClient';

async function fetchExactCount(table) {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

    if (error) {
        throw new Error(error.message || `Unable to count ${table}.`);
    }

    return count ?? 0;
}

export async function fetchAdminDashboard(options = {}) {
    const [members, stories, files, storyRatings, fileRatings] = await Promise.all([
        fetchExactCount('profiles'),
        fetchExactCount('stories'),
        fetchExactCount('user_files'),
        fetchExactCount('story_ratings'),
        fetchExactCount('file_ratings'),
    ]);

    let profilesQuery = supabase
        .from('profiles')
        .select('id,display_name,username,created_at,last_seen_at')
        .order('created_at', { ascending: false })
        .limit(12);

    let rolesQuery = supabase
        .from('user_roles')
        .select('user_id,role');

    let storiesQuery = supabase
        .from('stories')
        .select('id,title,author_id,status,visibility,created_at')
        .order('created_at', { ascending: false })
        .limit(12);

    let filesQuery = supabase
        .from('user_files')
        .select('id,user_id,file_name,mime_type,file_size,visibility,created_at')
        .order('created_at', { ascending: false })
        .limit(12);

    let storyRatingsQuery = supabase
        .from('story_ratings')
        .select('story_id,user_id,rating')
        .limit(12);

    let fileRatingsQuery = supabase
        .from('file_ratings')
        .select('file_id,user_id,rating')
        .limit(12);

    if (options.signal) {
        profilesQuery = profilesQuery.abortSignal(options.signal);
        rolesQuery = rolesQuery.abortSignal(options.signal);
        storiesQuery = storiesQuery.abortSignal(options.signal);
        filesQuery = filesQuery.abortSignal(options.signal);
        storyRatingsQuery = storyRatingsQuery.abortSignal(options.signal);
        fileRatingsQuery = fileRatingsQuery.abortSignal(options.signal);
    }

    const [profilesResult, rolesResult, storiesResult, filesResult, storyRatingsResult, fileRatingsResult] = await Promise.all([
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
        ['Story ratings', storyRatingsResult],
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
        },
        profiles: profilesResult.data ?? [],
        roles: rolesResult.data ?? [],
        stories: storiesResult.data ?? [],
        files: filesResult.data ?? [],
        storyRatings: storyRatingsResult.data ?? [],
        fileRatings: fileRatingsResult.data ?? [],
    };
}
