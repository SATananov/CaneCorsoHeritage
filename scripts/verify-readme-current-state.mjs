import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readme = readFileSync('README.md', 'utf8');

const required = [
    'Heritage and community web application',
    '`/my-documents` | Authenticated + complete profile | Personal document workspace',
    'Friend requests: send, cancel, accept, decline and remove',
    'Private messaging between accepted friends with realtime delivery and read/unread state',
    'Notification Center for Messages, Friend Requests, Comments, and Reactions & Ratings',
    'private `message-attachments` bucket',
    'Realtime Postgres Changes for private-message updates',
    'At that checkpoint, all 15 application tables then present',
    'the 2026-10-08 count is intentionally historical',
    'Vitest unit/component tests, React Testing Library',
    '4 test files and 18 passing tests',
    '`useOptimistic`, `useMemo` and `useCallback`',
    'These regression/static/runtime checks complement the formal Vitest unit/component suite.',
];

for (const text of required) {
    assert.ok(readme.includes(text), `README missing required current-state wording: ${text}`);
}

assert.ok(
    readme.includes('administrator moderation authority'),
    'README must distinguish owner operations from admin moderation authority',
);

assert.ok(
    readme.includes('does not attempt to prevent a browser user from saving content that is otherwise legitimately viewable'),
    'README must avoid overstating member-download enforcement',
);

assert.doesNotMatch(
    readme,
    /they are not presented as a substitute for formal unit\/component testing/,
    'README must not claim formal unit/component testing is absent after Vitest was added',
);

assert.doesNotMatch(
    readme,
    /React DevTools Profiler was used/,
    'README must not claim an unverifiable manual Profiler step',
);

assert.doesNotMatch(
    readme,
    /The deployed frontend is built from the `master` branch/,
    'README must not assert a Netlify branch setting that is not repository-verifiable',
);

assert.doesNotMatch(
    readme,
    /\*\*Category \/ topic:\*\* Heritage and community content platform/,
    'old category wording must be replaced',
);

console.log('PASS: README matches the verified project state, formal test setup and repository-supported claims.');
