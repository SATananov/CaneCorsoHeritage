import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');

assert.ok(
    !/from ['"]react['"];[\s\S]{0,0}/.test(''),
);

assert.ok(
    !bell.match(/import\s*\{[^}]*openOrCreatePrivateConversation[^}]*\}\s*from\s*['"]react['"]/s),
    'openOrCreatePrivateConversation must not be imported from react',
);

assert.ok(
    bell.match(/import\s*\{[^}]*openOrCreatePrivateConversation[^}]*\}\s*from\s*['"]\.\.\/services\/messageService['"]/s),
    'openOrCreatePrivateConversation must be imported from messageService',
);

assert.ok(
    bell.includes('async function handleFriendMessageOpen(event, friendId)'),
    'direct-chat handler exists',
);

assert.ok(
    bell.includes('await openOrCreatePrivateConversation('),
    'direct-chat handler opens/reuses conversation',
);

assert.ok(
    bell.includes('window.location.assign('),
    'direct-chat handler navigates to conversation',
);

console.log('PASS: NotificationBell imports openOrCreatePrivateConversation from messageService and direct chat handler is wired.');
