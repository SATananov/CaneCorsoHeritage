import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const modal = read('src/components/AddStoryModal.jsx');
const page = read('src/pages/MyStoriesPage.jsx');
const ui = read('src/i18n/storySaveUi.js');

assert.match(
    modal,
    /const createdStoryRef = useRef\(null\)/,
    'Create retry must keep the committed Story identity.',
);
assert.match(
    modal,
    /const committedStoryDataRef = useRef\(/,
    'The modal must remember the last committed Story payload.',
);
assert.match(
    modal,
    /!existingStory \|\| !storyDataMatches\(committedStoryDataRef\.current, storyData\)/,
    'A retry with unchanged committed Story data must skip a redundant Story write.',
);
assert.match(
    modal,
    /createdStoryRef\.current = savedStory/,
    'A committed CREATE must be retained before attachment completion.',
);
assert.match(
    modal,
    /committedStoryDataRef\.current = \{ \.\.\.storyData \}/,
    'The committed payload must advance immediately after a successful Story write.',
);
assert.match(
    modal,
    /getStoryPartialSaveError\(language\)/,
    'Attachment completion failure must not be reported as a Story save failure.',
);
assert.match(
    modal,
    /await onSaved\(savedStory\)/,
    'Post-save reconciliation must receive the committed Story for local upsert.',
);
assert.match(
    modal,
    /getStoryCompletionRefreshError\(language\)/,
    'Post-save callback failure must have distinct committed-save semantics.',
);
assert.match(
    modal,
    /uploadedFilesRef\.current\.some\(\(upload\) => \(/,
    'Successful attachment uploads must remain protected from duplicate retry uploads.',
);

assert.match(
    page,
    /function handleStorySaved\(savedStory\)/,
    'My Stories must have an explicit committed Story callback.',
);
assert.match(
    page,
    /currentStory\._id === savedStory\._id \? savedStory : currentStory/,
    'An edited committed Story must be updated locally before reconciliation.',
);
assert.match(
    page,
    /return \[savedStory, \.\.\.currentStories\]/,
    'A newly committed Story must be inserted locally before reconciliation.',
);
assert.match(
    page,
    /onSaved=\{handleStorySaved\}/g,
    'Create and edit flows must use the local-upsert callback.',
);

for (const language of ['en', 'bg', 'it']) {
    assert.match(
        ui,
        new RegExp(`${language}:\\s*'[^']+'`),
        `Partial-save UI must include ${language} localization.`,
    );
}

assert.ok(
    (ui.match(/const partialSaveErrors/g) ?? []).length === 1
    && (ui.match(/const completionRefreshErrors/g) ?? []).length === 1,
    'Attachment completion and post-save refresh errors must remain semantically distinct.',
);

console.log('verify-story-partial-save-semantics: PASS (17 checks)');
