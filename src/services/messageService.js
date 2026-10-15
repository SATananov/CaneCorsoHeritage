import { supabase } from '../lib/supabaseClient';

const CONVERSATION_COLUMNS = 'id,user_one_id,user_two_id,created_by,created_at';
const MESSAGE_COLUMNS = 'id,conversation_id,sender_id,body,created_at, attachment_path, attachment_name, attachment_mime_type, attachment_size';
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

const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';
const MESSAGE_ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024;
const MESSAGE_ATTACHMENT_MIME_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MESSAGE_ATTACHMENT_EXTENSION_TYPES = new Map([
    ['mp3', 'audio/mpeg'],
    ['wav', 'audio/wav'],
    ['ogg', 'audio/ogg'],
    ['m4a', 'audio/mp4'],
    ['aac', 'audio/aac'],
    ['flac', 'audio/flac'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['gif', 'image/gif'],
    ['webp', 'image/webp'],
    ['mp4', 'video/mp4'],
    ['webm', 'video/webm'],
    ['pdf', 'application/pdf'],
    ['txt', 'text/plain'],
    ['csv', 'text/csv'],
    ['doc', 'application/msword'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['odt', 'application/vnd.oasis.opendocument.text'],
    ['xls', 'application/vnd.ms-excel'],
    ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

function attachmentExtension(name) {
    const match = (name || '').toLowerCase().match(/\.([a-z0-9]{1,10})$/);
    return match?.[1] || '';
}

function normalizedAttachmentType(file) {
    const browserType = file?.type?.trim();

    if (browserType) {
        return browserType;
    }

    return MESSAGE_ATTACHMENT_EXTENSION_TYPES.get(attachmentExtension(file?.name)) || '';
}

function isSupportedMessageAttachment(file) {
    const type = normalizedAttachmentType(file);

    return (
        type.startsWith('image/')
        || type.startsWith('audio/')
        || type.startsWith('video/')
        || MESSAGE_ATTACHMENT_MIME_TYPES.has(type)
    );
}

function displayAttachmentName(name) {
    const value = (name || 'attachment').trim().slice(0, 255);
    return value || 'attachment';
}

export async function sendPrivateMessageAttachment(
    conversationId,
    senderId,
    file,
    caption = '',
) {
    requireId(conversationId, 'Conversation id');
    requireId(senderId, 'Sender id');

    if (!file?.name || typeof file.size !== 'number') {
        throw new Error('Attachment file is required.');
    }

    if (file.size < 1 || file.size > MESSAGE_ATTACHMENT_MAX_SIZE) {
        throw new Error('Attachment file is too large.');
    }

    if (!isSupportedMessageAttachment(file)) {
        throw new Error('Attachment file type is not supported.');
    }

    const displayName = displayAttachmentName(file.name);
    const message = caption?.trim() || displayName;
    const mimeType = normalizedAttachmentType(file);
    const extension = attachmentExtension(file.name);
    const uniqueId = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // Storage object names intentionally avoid the original user filename.
    // Supabase Storage object names are safest with its documented ASCII-safe
    // character set; the original Unicode filename is preserved in messages.
    const storageFileName = extension ? `${uniqueId}.${extension}` : uniqueId;
    const storagePath = `${conversationId}/${senderId}/${storageFileName}`;

    const { error: uploadError } = await supabase
        .storage
        .from(MESSAGE_ATTACHMENT_BUCKET)
        .upload(storagePath, file, {
            cacheControl: '3600',
            contentType: mimeType,
            upsert: false,
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            body: message.slice(0, 2000),
            attachment_path: storagePath,
            attachment_name: displayName,
            attachment_mime_type: mimeType,
            attachment_size: file.size,
        })
        .select(MESSAGE_COLUMNS)
        .single();

    if (error) {
        await supabase
            .storage
            .from(MESSAGE_ATTACHMENT_BUCKET)
            .remove([storagePath]);

        throw error;
    }

    return data;
}

export async function getPrivateMessageAttachmentUrl(message) {
    if (!message?.attachment_path) {
        return null;
    }

    const { data, error } = await supabase
        .storage
        .from(MESSAGE_ATTACHMENT_BUCKET)
        .createSignedUrl(message.attachment_path, 3600);

    if (error) {
        throw error;
    }

    return data?.signedUrl || null;
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
export function subscribeToConversationMessages(conversationId, onMessage) {
    requireId(conversationId, 'Conversation id');

    if (typeof onMessage !== 'function') {
        throw new Error('Message subscription callback is required.');
    }

    const channel = supabase
        .channel(`private-thread:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
                if (payload.new) {
                    onMessage(payload.new);
                }
            },
        )
        .subscribe();

    return () => {
        void supabase.removeChannel(channel);
    };
}

export function subscribeToPrivateMessageChanges(userId, onChange) {
    requireId(userId, 'User id');

    if (typeof onChange !== 'function') {
        throw new Error('Private message subscription callback is required.');
    }

    const channel = supabase
        .channel(`private-message-notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            },
            (payload) => {
                if (payload.new?.sender_id !== userId) {
                    onChange(payload.new);
                }
            },
        )
        .subscribe();

    return () => {
        void supabase.removeChannel(channel);
    };
}
