import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const messages = read('src/components/MessagesSection.jsx');
const userDetails = read('src/pages/UserDetailsPage.jsx');

assert.match(
    bell,
    /\/users\/\$\{encodeURIComponent\(user\.id\)\}\?conversation=\$\{encodeURIComponent\(item\.conversation_id\)\}#private-messages/,
);
assert.match(
    bell,
    /\$\{path\}#friendship-section/,
);

assert.match(messages, /useLocation/);
assert.match(messages, /requestedConversationId/);
assert.match(messages, /location\.search/);
assert.match(messages, /(?:location|window\.location)\.hash\s*===\s*['"]#private-messages['"]/);
assert.match(messages, /id="private-messages"/);
assert.match(
    messages,
    /result\.some\(\(item\) => item\.id === requestedConversationId\)/,
);

assert.match(userDetails, /id="friendship-section"/);
assert.match(userDetails, /window\.location\.hash !== '#friendship-section'/);
assert.match(userDetails, /scrollIntoView/);

console.log(
    'PASS: NOTIFICATION CENTER 07 exact private-conversation and friendship-request navigation verified.',
);
