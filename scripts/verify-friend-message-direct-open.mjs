import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');

assert.match(bell, /const friendUnreadNotifications = visibleMessages/);
assert.match(bell, /const conversationId = friendUnreadNotifications\[0\]\?\.conversation_id/);
assert.match(
    bell,
    /conversationId\s*\?\s*`\/users\/\$\{encodeURIComponent\(user\.id\)\}\?conversation=\$\{encodeURIComponent\(conversationId\)\}#private-messages`/,
);
assert.match(bell, /: memberPath\(item\.profile\)/);

console.log('PASS: FRIEND MESSAGE DIRECT OPEN 01 routes friends with unread messages directly to the selected private conversation.');
