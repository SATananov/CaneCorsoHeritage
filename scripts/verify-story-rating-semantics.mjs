import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const page = read('src/pages/StoryDetailsPage.jsx');
const rating = read('src/components/story/StoryRating.jsx');
const detailsHook = read('src/hooks/useStoryDetails.js');
const translations = read('src/i18n/translations.js');

assert.doesNotMatch(
    page,
    /saveStoryRating|fetchStoryRatings|ratingHandler/,
    'StoryDetailsPage must not own Story rating mutation/reconciliation semantics',
);
assert.match(
    page,
    /<StoryRating[\s\S]*storyId=\{storyId\}[\s\S]*isOwnStory=\{isOwnStory\}/,
    'StoryDetailsPage delegates Story rating behavior to StoryRating',
);
assert.doesNotMatch(
    detailsHook,
    /fetchStoryRatings|ratingInfo|setRatingInfo/,
    'useStoryDetails no longer performs a duplicate rating read',
);
assert.match(
    rating,
    /const \[loading, setLoading\] = useState\(true\)/,
    'Story ratings start gated until the authoritative read succeeds',
);
assert.match(
    rating,
    /!scope\?\.active \|\| !scope\.ready \|\| scope\.busy/,
    'Story rating writes require an active authoritative scope',
);
assert.match(
    rating,
    /let saved = false;[\s\S]*saved = true;[\s\S]*setError\(saved \? 'storyRatingLoadError' : 'saveRatingError'\)/,
    'Committed write + failed refresh is reported as a reconciliation error, not a save failure',
);
assert.match(
    rating,
    /setLoading\(true\);[\s\S]*setError\(saved \? 'storyRatingLoadError' : 'saveRatingError'\)/,
    'Any ambiguous write outcome gates another write until reconciliation',
);
assert.match(
    rating,
    /const retryHandler = \(\) => scopeRef\.current\?\.reload\(\)/,
    'Retry performs a read-only ratings reload',
);
assert.match(
    rating,
    /disabled=\{!canRate \|\| saving \|\| loading\}/,
    'Story rating buttons remain disabled while state is unknown or saving',
);
assert.match(
    rating,
    /error && loading[\s\S]*onClick=\{retryHandler\}/,
    'Reconciliation error exposes a retry control',
);

for (const key of ['storyRatingLoadError', 'storyRatingRetry']) {
    const matches = translations.match(new RegExp(`\\b${key}:`, 'g')) ?? [];
    assert.equal(matches.length, 3, `${key} must exist in EN/BG/IT`);
}

console.log('STORY RATING SEMANTICS 01: PASS');
console.log('Story rating writes are gated by authoritative reads and committed-write refresh failures require read-only reconciliation.');
