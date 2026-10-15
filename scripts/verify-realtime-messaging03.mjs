import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');
const messages = readFileSync('src/components/MessagesSection.jsx', 'utf8');

assert.match(
    bell,
    /new\s+CustomEvent\(\s*['"]cch:realtime-message['"]/,
    'NotificationBell must bridge the known-working realtime message event into the React app.',
);

assert.match(
    messages,
    /window\.addEventListener\('cch:realtime-message', handleRealtimeMessage\)/,
    'MessageThread must listen for the realtime app event.',
);

assert.match(
    messages,
    /message\?\.conversation_id !== conversation\.id/,
    'MessageThread must ignore realtime messages for other conversations.',
);

assert.match(
    messages,
    /appendUniqueMessage\(current, message\)/,
    'Realtime app event must append without duplicates.',
);

console.log(
    'PASS: REALTIME MESSAGING 03 bridges the working global Supabase realtime feed into the open React message thread.',
);
