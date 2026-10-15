import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');
const files = readFileSync('src/pages/MyFilesPage.jsx', 'utf8');

assert.match(
    bell,
    /\}, \[canUseNotifications, loadNotifications, user\]\);/,
    'NotificationBell realtime effect must include user in dependencies.',
);

assert.match(
    files,
    /if \(typeof window === 'undefined'\) \{\s*return;\s*\}/,
    'MyFilesPage hash navigation effect must tolerate non-browser verifier execution.',
);

console.log(
    'PASS: REALTIME MESSAGING 01 REPAIR fixes hook dependency hygiene and non-browser hash-navigation verification.',
);
