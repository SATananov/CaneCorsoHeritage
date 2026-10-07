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
];

for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /useLanguage/, `${file} must use the shared language context`);
    assert.match(source, /getTranslation/, `${file} must use the shared translations`);
}

const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');
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
console.log('Stories / Heritage / Members public UI is wired to EN / BG / IT.');
