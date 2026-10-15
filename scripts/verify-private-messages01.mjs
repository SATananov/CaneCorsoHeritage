import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const userDetails = read('src/pages/UserDetailsPage.jsx');
const component = read('src/components/MessagesSection.jsx');
const service = read('src/services/messageService.js');
const translations = read('src/i18n/messageTranslations.js');
const migration = read('supabase/migrations/20261015071000_private_messages_01.sql');

assert.match(userDetails, /import MessagesSection from '\.\.\/components\/MessagesSection';/);
assert.match(userDetails, /<MessagesSection\s+profileId=\{profile\.id\}\s+isOwnProfile=\{isOwnProfile\}\s*\/>/);

assert.match(component, /fetchFriendshipWithMember/);
assert.match(component, /openOrCreatePrivateConversation/);
assert.match(component, /fetchPrivateConversations/);
assert.match(component, /fetchConversationMessages/);
assert.match(component, /sendPrivateMessage/);
assert.match(component, /status === 'accepted'/);
assert.match(component, /cch:messages-changed/);
assert.match(component, /maxLength=\{2000\}/);

assert.match(service, /\.from\('conversations'\)/);
assert.match(service, /\.from\('messages'\)/);
assert.match(service, /normalizePair/);
assert.match(service, /error\.code === '23505'/);
assert.match(service, /body\.trim|body\?\.trim/);

assert.match(translations, /en:\s*\{/);
assert.match(translations, /bg:\s*\{/);
assert.match(translations, /it:\s*\{/);
assert.match(translations, /friendsOnly:/);
assert.match(translations, /messagePlaceholder:/);

assert.match(migration, /create table if not exists public\.conversations/);
assert.match(migration, /create table if not exists public\.messages/);
assert.match(migration, /alter table public\.conversations enable row level security/);
assert.match(migration, /alter table public\.messages enable row level security/);
assert.match(migration, /conversations_unique_pair/);
assert.match(migration, /conversations_friends_create/);
assert.match(migration, /messages_participants_read/);
assert.match(migration, /messages_friend_participants_insert/);
assert.match(migration, /f\.status = 'accepted'/);
assert.doesNotMatch(migration, /grant\s+(update|delete)/i);

console.log('PASS: MESSAGES 01 private friend-to-friend conversations, RLS and profile integration verified.');
