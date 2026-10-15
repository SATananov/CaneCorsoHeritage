import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/NotificationBell.jsx', 'utf8');

assert.match(source, /const notificationRequestRef = useRef\(0\);/);
assert.doesNotMatch(source, /notificationUserRef/);

assert.match(source, /const requestId = notificationRequestRef\.current \+ 1;/);
assert.match(source, /notificationRequestRef\.current = requestId;/);

assert.match(
    source,
    /if \(notificationRequestRef\.current !== requestId\) \{\s*return;\s*\}/,
    'stale success is ignored',
);

assert.match(
    source,
    /if \(notificationRequestRef\.current === requestId\) \{\s*setLoadError\(true\);\s*\}/,
    'only current request may publish an error',
);

assert.match(
    source,
    /if \(notificationRequestRef\.current === requestId\) \{\s*setLoading\(false\);\s*\}/,
    'only current request may complete loading',
);

assert.match(
    source,
    /return \(\) => \{\s*active = false;\s*notificationRequestRef\.current \+= 1;/,
    'effect cleanup invalidates in-flight requests on scope change or unmount',
);

console.log('PASS: notification refresh race guard is request-sequenced and React-ref-safe.');
