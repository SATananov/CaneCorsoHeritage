import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const styles = read('src/components/NotificationBell.module.css');
const translations = read('src/i18n/notificationTranslations.js');

assert.match(bell, /function AccordionSection/);
assert.match(bell, /aria-controls=\{panelId\}/);
assert.match(bell, /aria-expanded=\{expanded\}/);

assert.match(
    bell,
    /toggleSection\('messages'(?:,\s*unreadMessageCount)?\)/,
);
assert.match(
    bell,
    /toggleSection\('friends'(?:,\s*friendRequestCount)?\)/,
);

assert.match(bell, /unreadMessageCount/);
assert.match(bell, /friendRequestCount/);
assert.match(bell, /fetchUnreadMessageNotifications/);
assert.match(bell, /fetchFriendOverview/);
assert.match(bell, /privateMessages/);
assert.match(bell, /friendRequests/);

assert.match(styles, /\.accordionSection/);
assert.match(styles, /\.accordionTrigger/);
assert.match(styles, /\.accordionPanel/);
assert.match(styles, /\.sectionCountActive/);

assert.match(translations, /title: 'Notification center'/);
assert.match(translations, /title: 'Център за известия'/);
assert.match(translations, /title: 'Centro notifiche'/);
assert.match(translations, /emptyFriends:/);
assert.match(translations, /emptyMessages:/);
assert.match(translations, /comments:/);

console.log(
    'PASS: NOTIFICATION CENTER 03 accordion categories remain compatible with later smart-state extensions.',
);
