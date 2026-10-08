import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const service = read('src/services/storyService.js');
const modal = read('src/components/StoryDeleteModal.jsx');
const page = read('src/pages/MyStoriesPage.jsx');
const ui = read('src/i18n/storyDeleteUi.js');

assert.match(
    service,
    /cleanupError\.storyDeleteCommitted\s*=\s*true/,
    'Storage cleanup failure must explicitly mark the Story delete as committed.',
);
assert.match(
    service,
    /cleanupError\.cleanupFailed\s*=\s*true/,
    'Storage cleanup failure must retain explicit cleanup-failure semantics.',
);

assert.match(
    modal,
    /if \(deleteError\?\.storyDeleteCommitted\)/,
    'The delete modal must distinguish committed delete cleanup failures from pre-commit failures.',
);
assert.match(
    modal,
    /cleanupWarning:\s*getStoryDeleteCleanupWarning\(language\)/,
    'Committed cleanup failures must produce a localized cleanup warning.',
);
assert.match(
    modal,
    /setError\(t\('error'\)\)/,
    'Pre-commit delete failures must remain normal delete errors.',
);

assert.match(
    page,
    /setStories\(\(currentStories\) => currentStories\.filter\(\(story\) => story\._id !== storyId\)\)/,
    'Committed Story deletes must be reflected locally before reconciliation.',
);
assert.match(
    page,
    /const \[refreshError, setRefreshError\] = useState\(''\)/,
    'Refresh failures must be separated from initial fatal load failures.',
);
assert.match(
    page,
    /refreshError && <div className=\{styles\.message\} role="alert">\{refreshError\}<\/div>/,
    'A failed reconciliation read must remain visible without hiding the locally updated Story list.',
);
assert.match(
    page,
    /deleteNotice && <div className=\{styles\.message\} role="status">\{deleteNotice\}<\/div>/,
    'Committed cleanup failures must surface a non-destructive notice.',
);

for (const language of ['en', 'bg', 'it']) {
    assert.match(
        ui,
        new RegExp(`${language}:\\s*'[^']+'`),
        `Cleanup warning must be localized for ${language}.`,
    );
}

console.log('verify-story-delete-ui-semantics: PASS (10 checks)');
