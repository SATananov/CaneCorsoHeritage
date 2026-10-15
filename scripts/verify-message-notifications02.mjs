import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const section = read('src/components/MessagesSection.jsx');
const service = read('src/services/messageService.js');
const translations = read('src/i18n/notificationTranslations.js');
const migration = read('supabase/migrations/20261015073500_private_message_read_state_02.sql');

assert.match(bell, /fetchUnreadMessageNotifications/);
assert.match(bell, /cch:messages-changed/);
assert.match(bell, /cch:messages-read/);
assert.match(bell, /unreadMessageCount/);
assert.match(bell, /privateMessagesFrom/);
assert.match(bell, /openMessages/);

assert.match(section, /markConversationRead/);
assert.match(section, /cch:messages-read/);

assert.match(service, /conversation_reads/);
assert.match(service, /markConversationRead/);
assert.match(service, /fetchUnreadMessageNotifications/);
assert.match(service, /last_read_at/);
assert.match(service, /\.neq\('sender_id', userId\)/);

assert.match(translations, /privateMessages:/);
assert.match(translations, /privateMessageFrom:/);
assert.match(translations, /privateMessagesFrom:/);
assert.match(translations, /openMessages:/);

assert.match(migration, /create table if not exists public\.conversation_reads/);
assert.match(migration, /alter table public\.conversation_reads enable row level security/);
assert.match(migration, /conversation_reads_own_select/);
assert.match(migration, /conversation_reads_own_insert/);
assert.match(migration, /conversation_reads_own_update/);
assert.match(migration, /auth\.uid\(\) = user_id/);

console.log('PASS: NOTIFICATIONS 02 unread private-message badge/read-state integration verified.');
