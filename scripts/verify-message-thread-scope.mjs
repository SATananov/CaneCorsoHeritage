import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/MessagesSection.jsx', 'utf8');

assert.match(
    source,
    /<MessageThread\s+key=\{activeConversation\.id\}\s+conversation=\{activeConversation\}/,
    'direct-profile MessageThread is keyed by conversation identity',
);

assert.match(
    source,
    /<MessageThread\s+key=\{selectedConversation\.id\}\s+conversation=\{selectedConversation\}/,
    'conversation-list MessageThread is keyed by conversation identity',
);

assert.match(
    source,
    /const \[draft, setDraft\] = useState\(''\)/,
    'draft remains local MessageThread state',
);

assert.match(
    source,
    /const \[selectedFile, setSelectedFile\] = useState\(null\)/,
    'attachment selection remains local MessageThread state',
);

assert.match(
    source,
    /const \[loadedConversationId, setLoadedConversationId\] = useState\(null\)/,
    'loaded conversation identity remains local MessageThread state',
);

console.log(
    'PASS: MessageThread state is scoped by conversation key, so switching A -> B remounts the thread and prevents late A state updates from mutating B.',
);
