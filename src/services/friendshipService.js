import { supabase } from '../lib/supabaseClient';

const FRIENDSHIP_COLUMNS = 'id,requester_id,addressee_id,status,created_at,responded_at';
const PROFILE_COLUMNS = 'id,username,display_name';

function requireId(value, label) {
    if (!value) {
        throw new Error(`${label} is required.`);
    }
}

function withAbortSignal(query, signal) {
    return signal ? query.abortSignal(signal) : query;
}

function otherUserId(friendship, userId) {
    return friendship.requester_id === userId
        ? friendship.addressee_id
        : friendship.requester_id;
}

async function fetchProfilesByIds(ids, { signal } = {}) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) {
        return new Map();
    }

    let query = supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .in('id', uniqueIds);

    query = withAbortSignal(query, signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function fetchRelationshipsForUser(userId, { signal } = {}) {
    requireId(userId, 'User id');

    let query = supabase
        .from('friendships')
        .select(FRIENDSHIP_COLUMNS)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    query = withAbortSignal(query, signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data || [];
}

function enrichRelationship(friendship, userId, profileMap) {
    const counterpartId = otherUserId(friendship, userId);

    return {
        ...friendship,
        other_user_id: counterpartId,
        profile: profileMap.get(counterpartId) || {
            id: counterpartId,
            username: '',
            display_name: '',
        },
    };
}

export async function fetchFriendshipWithMember(userId, memberId, options = {}) {
    requireId(userId, 'User id');
    requireId(memberId, 'Member id');

    if (userId === memberId) {
        return null;
    }

    const relationships = await fetchRelationshipsForUser(userId, options);

    return relationships.find((friendship) => (
        friendship.requester_id === memberId
        || friendship.addressee_id === memberId
    )) || null;
}

export async function fetchFriendOverview(userId, options = {}) {
    const relationships = await fetchRelationshipsForUser(userId, options);
    const counterpartIds = relationships.map((friendship) => otherUserId(friendship, userId));
    const profileMap = await fetchProfilesByIds(counterpartIds, options);

    const enriched = relationships.map((friendship) => (
        enrichRelationship(friendship, userId, profileMap)
    ));

    return {
        friends: enriched.filter((item) => item.status === 'accepted'),
        incoming: enriched.filter((item) => (
            item.status === 'pending' && item.addressee_id === userId
        )),
        outgoing: enriched.filter((item) => (
            item.status === 'pending' && item.requester_id === userId
        )),
    };
}

export async function sendFriendRequest(requesterId, addresseeId) {
    requireId(requesterId, 'Requester id');
    requireId(addresseeId, 'Addressee id');

    if (requesterId === addresseeId) {
        throw new Error('You cannot send a friend request to yourself.');
    }

    const { data, error } = await supabase
        .from('friendships')
        .insert({
            requester_id: requesterId,
            addressee_id: addresseeId,
            status: 'pending',
        })
        .select(FRIENDSHIP_COLUMNS)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function acceptFriendRequest(friendshipId) {
    requireId(friendshipId, 'Friendship id');

    const { data, error } = await supabase
        .from('friendships')
        .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
        })
        .eq('id', friendshipId)
        .select(FRIENDSHIP_COLUMNS)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Friend request was not accepted.');
    }

    return data;
}

export async function deleteFriendship(friendshipId) {
    requireId(friendshipId, 'Friendship id');

    const { data, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .select('id')
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Friendship was not changed.');
    }

    return data;
}
