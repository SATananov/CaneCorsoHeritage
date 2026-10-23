import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = [
    'src/components/StoriesPreviewSection.jsx',
    'src/components/HeritagePreviewSection.jsx',
    'src/components/PreviewCard.jsx',
    'src/components/MediaRating.jsx',
    'src/pages/UsersPage.jsx',
    'src/pages/HeritageArticlePage.jsx',
    'src/pages/StoryDetailsPage.jsx',
    'src/pages/GalleryPage.jsx',
];

for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /useLanguage/, `${file} must use the shared language context`);
    assert.match(source, /getTranslation/, `${file} must use the shared translations`);
}

const gallery = fs.readFileSync('src/pages/GalleryPage.jsx', 'utf8');
const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');

assert.match(
    gallery,
    /file\.story_id && !isStoryTextFile\(file\)/,
    'media cards must keep the reciprocal link back to the related Story',
);
assert.match(
    gallery,
    /getRelatedMediaFile\(file, files\)/,
    'text Story files must resolve one related sibling media file',
);
assert.match(
    gallery,
    /candidate\.story_id === file\.story_id/,
    'related media must belong to the same Story',
);
assert.match(
    gallery,
    /t\(getRelatedMediaTranslationKey\(relatedMedia\)\)/,
    'related media action must use a localized type-specific label',
);

for (const key of [
    'viewRelatedImage',
    'listenRelatedAudio',
    'viewRelatedVideo',
    'openRelatedDocument',
]) {
    const matches = translations.match(new RegExp(`\\b${key}:\\s*`, 'g')) ?? [];
    assert.equal(matches.length, 3, `${key} must exist exactly once in EN/BG/IT`);
}

for (const section of [
    'publicStories',
    'publicHeritage',
    'members',
    'previewCard',
    'storyDetails',
    'heritageDetails',
    'mediaRating',
]) {
    const matches = translations.match(new RegExp(`\\b${section}:\\s*\\{`, 'g')) ?? [];
    assert.equal(matches.length, 3, `${section} must exist in EN/BG/IT`);
}

console.log('LANGUAGE PUBLIC UI 02B: PASS');
console.log('Stories / Heritage / Members / Gallery public UI is wired to EN / BG / IT, including reciprocal Story/media actions.');
