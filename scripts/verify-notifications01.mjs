import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const header = read('src/components/Header.jsx');
const bell = read('src/components/NotificationBell.jsx');
const styles = read('src/components/NotificationBell.module.css');
const translations = read('src/i18n/notificationTranslations.js');
const friendshipService = read('src/services/friendshipService.js');

assert.match(header, /import NotificationBell from '\.\/NotificationBell';/);
assert.match(header, /<NotificationBell \/>/);

assert.match(bell, /fetchFriendOverview/);
assert.match(bell, /acceptFriendRequest/);
assert.match(bell, /deleteFriendship/);
assert.match(bell, /overview\.incoming/);
assert.match(bell, /REFRESH_INTERVAL_MS = 30000/);
assert.match(bell, /window\.addEventListener\('focus'/);
assert.match(bell, /visibilitychange/);
assert.match(bell, /cch:friendships-changed/);
assert.match(bell, /aria-expanded=\{open\}/);
assert.match(bell, /role="dialog"/);
assert.match(bell, /friendRequestFrom/);
assert.match(bell, /viewProfile/);

assert.match(styles, /\.badge/);
assert.match(styles, /\.panel/);
assert.match(styles, /\.bellButton/);

assert.match(translations, /en:\s*\{/);
assert.match(translations, /bg:\s*\{/);
assert.match(translations, /it:\s*\{/);
assert.match(translations, /friendRequestFrom:/);
assert.match(translations, /ariaLabel:/);

assert.match(friendshipService, /export async function fetchFriendOverview/);
assert.match(friendshipService, /status === 'pending'/);

console.log('PASS: NOTIFICATIONS 01 friend-request bell, badge, dropdown actions and EN/BG/IT UI verified.');
