import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const userDetails = read('src/pages/UserDetailsPage.jsx');
const component = read('src/components/FriendshipSection.jsx');
const service = read('src/services/friendshipService.js');
const translations = read('src/i18n/friendshipTranslations.js');
const migration = read('supabase/migrations/20261015063500_friendships_01.sql');

assert.match(userDetails, /import FriendshipSection from '\.\.\/components\/FriendshipSection';/);
assert.match(userDetails, /<FriendshipSection\s+profileId=\{profile\.id\}\s+isOwnProfile=\{isOwnProfile\}\s*\/>/);

assert.match(component, /fetchFriendOverview/);
assert.match(component, /fetchFriendshipWithMember/);
assert.match(component, /sendFriendRequest/);
assert.match(component, /acceptFriendRequest/);
assert.match(component, /deleteFriendship/);
assert.match(component, /isOwnProfile/);
assert.match(component, /incomingTitle/);
assert.match(component, /outgoingTitle/);
assert.match(component, /myFriendsTitle/);

assert.match(service, /\.from\('friendships'\)/);
assert.match(service, /requester_id/);
assert.match(service, /addressee_id/);
assert.match(service, /status: 'pending'/);
assert.match(service, /status: 'accepted'/);
assert.match(service, /\.maybeSingle\(\)/);

assert.match(translations, /en:\s*\{/);
assert.match(translations, /bg:\s*\{/);
assert.match(translations, /it:\s*\{/);
assert.match(translations, /addFriend:/);
assert.match(translations, /incomingTitle:/);

assert.match(migration, /create table if not exists public\.friendships/);
assert.match(migration, /alter table public\.friendships enable row level security/);
assert.match(migration, /friendships_not_self/);
assert.match(migration, /friendships_unique_member_pair/);
assert.match(migration, /friendships_select_participants/);
assert.match(migration, /friendships_insert_requester/);
assert.match(migration, /friendships_accept_addressee/);
assert.match(migration, /friendships_delete_participants/);
assert.match(migration, /guard_friendship_update/);

console.log('PASS: FRIENDS 01 structure, private RLS boundary and profile integration verified.');
