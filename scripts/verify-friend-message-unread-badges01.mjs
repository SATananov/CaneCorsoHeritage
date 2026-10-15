import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');
const css = readFileSync('src/components/NotificationBell.module.css', 'utf8');

assert.ok(bell.includes('const friendUnreadNotifications = visibleMessages'));
assert.ok(bell.includes('const unreadCount = friendUnreadNotifications'));
assert.ok(bell.includes('styles.messageFriendUnread'));
assert.ok(bell.includes('unreadCount > 0'));
assert.match(css, /\.messageFriendUnread\b/);

console.log('PASS: FRIEND MESSAGE UNREAD BADGES 01');
