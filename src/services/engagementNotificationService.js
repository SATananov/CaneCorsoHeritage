import { supabase } from '../lib/supabaseClient';

const PROFILE_COLUMNS = 'id,username,display_name';

function withAbortSignal(query, signal) {
    return signal ? query.abortSignal(signal) : query;
}

function actorName(profile) {
    return profile?.display_name?.trim()
        || (profile?.username ? `@${profile.username}` : '');
}

async function fetchActorProfiles(actorIds, options = {}) {
    const uniqueIds = [...new Set(actorIds.filter(Boolean))];

    if (uniqueIds.length === 0) {
        return new Map();
    }

    try {
        let query = supabase
            .from('profiles')
            .select(PROFILE_COLUMNS)
            .in('id', uniqueIds);

        query = withAbortSignal(query, options.signal);

        const { data, error } = await query;

        if (error) {
            return new Map();
        }

        return new Map((data || []).map((profile) => [profile.id, profile]));
    } catch {
        return new Map();
    }
}

export async function fetchUnreadEngagementNotifications(userId, options = {}) {
    if (!userId) {
        throw new Error('User id is required.');
    }

    let query = supabase
        .from('notification_events')
        .select(
            'id,recipient_id,actor_id,type,source_key,target_type,target_id,context_type,context_id,target_label,value,created_at,updated_at,read_at',
        )
        .eq('recipient_id', userId)
        .is('read_at', null)
        .in('type', ['comment_reaction', 'story_rating', 'file_rating'])
        .order('updated_at', { ascending: false });

    query = withAbortSignal(query, options.signal);

    const { data: events, error } = await query;

    if (error) {
        throw error;
    }

    const rows = events || [];

    if (rows.length === 0) {
        return [];
    }

    // Notification rows are authoritative. Profile enrichment is optional.
    const profileMap = await fetchActorProfiles(
        rows.map((item) => item.actor_id),
        options,
    );

    return rows.map((item) => {
        const profile = profileMap.get(item.actor_id) || {
            id: item.actor_id,
            username: '',
            display_name: '',
        };

        return {
            ...item,
            profile,
            actor_name: actorName(profile),
        };
    });
}

export async function markEngagementNotificationRead(userId, eventId) {
    if (!userId) {
        throw new Error('User id is required.');
    }

    if (!eventId) {
        throw new Error('Notification event id is required.');
    }

    const { error } = await supabase
        .from('notification_events')
        .update({ read_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('recipient_id', userId);

    if (error) {
        throw error;
    }
}
