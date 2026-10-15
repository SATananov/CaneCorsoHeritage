import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');

assert.match(
    bell,
    /to=\{`\/users\/\$\{encodeURIComponent\(user\.id\)\}\?conversation=\$\{encodeURIComponent\(item\.conversation_id\)\}#private-messages`\}/,
    'Message notification must navigate to an existing own-profile route.',
);

assert.match(
    bell,
    /setMessageNotifications\(\(current\) => current\.filter\(/,
    'Opening a conversation should optimistically remove its unread notification.',
);

assert.match(
    bell,
    /(?:item|notification)\.conversation_id\s*!==\s*conversationId/,
    'Unread message state should clear the opened conversation only.',
);

assert.match(
    bell,
    /window\.dispatchEvent\(new Event\('cch:messages-read'\)\)/,
    'Opening a message notification should wake other unread-message consumers.',
);

console.log(
    'PASS: REALTIME MESSAGING 02 routes message notifications to the existing own-profile page and clears the opened conversation badge immediately.',
);
