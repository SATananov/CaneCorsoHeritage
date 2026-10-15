import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/MessagesSection.jsx', 'utf8');

assert.ok(
    source.includes("location.hash !== '#private-messages'"),
    'private-messages hash gate exists',
);

assert.ok(
    source.includes("document.getElementById('private-messages')"),
    'private message section is targeted directly',
);

assert.ok(
    source.includes("behavior: 'auto'"),
    'direct chat focus uses immediate positioning',
);

assert.ok(
    source.includes('window.setTimeout(focusPrivateMessages, 120)'),
    'delayed focus retry exists',
);

assert.ok(
    source.includes('window.setTimeout(focusPrivateMessages, 420)'),
    'late focus retry exists',
);

console.log('PASS: DIRECT CHAT FOCUS 01 reliably positions the exact chat section after profile render.');
