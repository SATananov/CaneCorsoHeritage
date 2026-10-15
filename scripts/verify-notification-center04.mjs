import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const service = read('src/services/commentNotificationService.js');
const translations = read('src/i18n/notificationTranslations.js');

assert.match(bell, /fetchUnreadCommentNotifications/);
assert.match(bell, /markCommentNotificationRead/);
assert.match(bell, /notification-comments/);
assert.match(bell, /commentCount/);
assert.match(bell, /isExpanded\('comments', commentCount\)/);
assert.match(bell, /toggleSection\('comments', commentCount\)/);

assert.match(service, /comment_notification_reads/);
assert.match(service, /fetchUnreadCommentNotifications/);
assert.match(service, /markCommentNotificationRead/);

assert.match(translations, /comments:/);
assert.match(translations, /emptyComments:/);
assert.match(translations, /commentFrom:/);
assert.match(translations, /openComment:/);

console.log(
    'PASS: NOTIFICATION CENTER 04 comment category remains compatible with later per-comment read/deep-link extensions.',
);
