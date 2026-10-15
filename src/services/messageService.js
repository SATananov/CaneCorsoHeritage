import { supabase } from '../lib/supabaseClient';

const CONVERSATION_COLUMNS = 'id,user_one_id,user_two_id,created_by,created_at';
const MESSAGE_COLUMNS = 'id,conversation_id,sender_id,body,created_at';
const PROFILE_COLUMNS = 'id,username,display_name';
const READ_COLUMNS = 'conversation_id,user_id,last_read_at';

function requireId(value, label) {
    if (!value) {
        throw new Error(`${label} is required.`);
    }
}

function normalizePair(firstId, secondId) {
    requireId(firstId, 'First member id');
    requireId(secondId, 'Second member id');

    if (firstId === secondId) {
        throw new Error('A private conversation requires two different members.');
    }

    return [firstId, secondId].sort();
}

function withAbortSignal(query, signal) {
    return signal ? query.abortSignal(signal) : query;
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

export async function fetchPrivateConversation(userId, memberId, options = {}) {
    const [userOneId, userTwoId] = normalizePair(userId, memberId);

    let query = supabase
        .from('conversations')
        .select(CONVERSATION_COLUMNS)
        .eq('user_one_id', userOneId)
        .eq('user_two_id', userTwoId)
        .maybeSingle();

    query = withAbortSignal(query, options.signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data || null;
}

export async function openOrCreatePrivateConversation(userId, memberId) {
    const existing = await fetchPrivateConversation(userId, memberId);

    if (existing) {
        return existing;
    }

    const [userOneId, userTwoId] = normalizePair(userId, memberId);

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            user_one_id: userOneId,
            user_two_id: userTwoId,
            created_by: userId,
        })
        .select(CONVERSATION_COLUMNS)
        .single();

    if (!error) {
        return data;
    }

    if (error.code === '23505') {
        const concurrent = await fetchPrivateConversation(userId, memberId);

        if (concurrent) {
            return concurrent;
        }
    }

    throw error;
}

export async function fetchPrivateConversations(userId, options = {}) {
    requireId(userId, 'User id');

    let query = supabase
        .from('conversations')
        .select(CONVERSATION_COLUMNS)
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    query = withAbortSignal(query, options.signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    const conversations = data || [];
    const counterpartIds = conversations.map((conversation) => (
        conversation.user_one_id === userId
            ? conversation.user_two_id
            : conversation.user_one_id
    ));
    const profileMap = await fetchProfilesByIds(counterpartIds, options);

    return conversations.map((conversation) => {
        const otherUserId = conversation.user_one_id === userId
            ? conversation.user_two_id
            : conversation.user_one_id;

        return {
            ...conversation,
            other_user_id: otherUserId,
            profile: profileMap.get(otherUserId) || {
                id: otherUserId,
                username: '',
                display_name: '',
            },
        };
    });
}

export async function fetchConversationMessages(conversationId, options = {}) {
    requireId(conversationId, 'Conversation id');

    let query = supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    query = withAbortSignal(query, options.signal);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data || [];
}

export async function sendPrivateMessage(conversationId, senderId, body) {
    requireId(conversationId, 'Conversation id');
    requireId(senderId, 'Sender id');

    const message = body?.trim();

    if (!message) {
        throw new Error('Message body is required.');
    }

    if (message.length > 2000) {
        throw new Error('Message body is too long.');
    }

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            body: message,
        })
        .select(MESSAGE_COLUMNS)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function markConversationRead(conversationId, userId) {
    requireId(conversationId, 'Conversation id');
    requireId(userId, 'User id');

    const { error } = await supabase
        .from('conversation_reads')
        .upsert(
            {
                conversation_id: conversationId,
                user_id: userId,
                last_read_at: new Date().toISOString(),
            },
            { onConflict: 'conversation_id,user_id' },
        );

    if (error) {
        throw error;
    }
}

export async function fetchUnreadMessageNotifications(userId, options = {}) {
    requireId(userId, 'User id');

    const conversations = await fetchPrivateConversations(userId, options);

    if (conversations.length === 0) {
        return [];
    }

    const conversationIds = conversations.map((conversation) => conversation.id);

    let readQuery = supabase
        .from('conversation_reads')
        .select(READ_COLUMNS)
        .eq('user_id', userId)
        .in('conversation_id', conversationIds);

    readQuery = withAbortSignal(readQuery, options.signal);

    const { data: readRows, error: readError } = await readQuery;

    if (readError) {
        throw readError;
    }

    const readMap = new Map(
        (readRows || []).map((row) => [row.conversation_id, row.last_read_at]),
    );

    let messageQuery = supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .order('created_at', { ascending: false });

    messageQuery = withAbortSignal(messageQuery, options.signal);

    const { data: messageRows, error: messageError } = await messageQuery;

    if (messageError) {
        throw messageError;
    }

    const grouped = new Map();

    for (const message of messageRows || []) {
        const lastReadAt = readMap.get(message.conversation_id);
        const unread = !lastReadAt
            || new Date(message.created_at).getTime() > new Date(lastReadAt).getTime();

        if (!unread) {
            continue;
        }

        const current = grouped.get(message.conversation_id) || {
            count: 0,
            latest: null,
        };

        current.count += 1;

        if (!current.latest) {
            current.latest = message;
        }

        grouped.set(message.conversation_id, current);
    }

    return conversations
        .map((conversation) => {
            const unread = grouped.get(conversation.id);

            if (!unread) {
                return null;
            }

            return {
                conversation_id: conversation.id,
                count: unread.count,
                latest_message: unread.latest,
                profile: conversation.profile,
            };
        })
        .filter(Boolean)
        .sort((first, second) => (
            new Date(second.latest_message.created_at).getTime()
            - new Date(first.latest_message.created_at).getTime()
        ));
}
