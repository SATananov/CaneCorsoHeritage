import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync('src/services/messageService.js', 'utf8');
const messages = readFileSync('src/components/MessagesSection.jsx', 'utf8');
const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');
const migration = readFileSync(
    'supabase/migrations/20261015102000_realtime_messages_01.sql',
    'utf8',
);

assert.match(service, /export function subscribeToConversationMessages/);
assert.match(service, /filter: `conversation_id=eq\.\$\{conversationId\}`/);
assert.match(service, /event: 'INSERT'/);
assert.match(service, /table: 'messages'/);
assert.match(service, /export function subscribeToPrivateMessageChanges/);
assert.match(service, /supabase\.removeChannel\(channel\)/);

assert.match(messages, /subscribeToConversationMessages/);
assert.match(messages, /appendUniqueMessage/);
assert.match(messages, /loadedConversationId !== conversation\.id/);
assert.match(messages, /message\.sender_id !== user\.id/);
assert.match(messages, /markConversationRead\(conversation\.id, user\.id\)/);

assert.match(bell, /subscribeToPrivateMessageChanges/);
assert.match(bell, /const unsubscribeMessages = subscribeToPrivateMessageChanges/);
assert.match(bell, /unsubscribeMessages\(\)/);

assert.match(migration, /pg_publication_tables/);
assert.match(migration, /supabase_realtime/);
assert.match(migration, /alter publication supabase_realtime add table public\.messages/);

console.log(
    'PASS: REALTIME MESSAGING 01 subscribes React message threads and unread notifications to Supabase Realtime.',
);
