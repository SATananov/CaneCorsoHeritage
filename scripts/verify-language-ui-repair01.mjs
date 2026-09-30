import fs from 'node:fs';
import assert from 'node:assert/strict';

const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');
for (const section of [
    'publicStories',
    'publicHeritage',
    'members',
    'previewCard',
    'storyDetails',
    'heritageDetails',
    'mediaRating',
    'globalUi',
]) {
    const count = (translations.match(new RegExp(`\\b${section}:\\s*\\{`, 'g')) ?? []).length;
    assert.equal(count, 3, `${section} must exist exactly once in EN, BG and IT`);
}

const css = fs.readFileSync('src/App.css', 'utf8');
assert.doesNotMatch(
    css,
    /\.paths-section\s*,\s*\.signed-in-user\s*\{/,
    'paths-section must not share the signed-in-user pill rule',
);

for (const file of [
    'src/components/StoriesPreviewSection.jsx',
    'src/components/HeritagePreviewSection.jsx',
]) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /getTranslation/, `${file} must use translations`);
}

console.log('LANGUAGE UI REPAIR 01: PASS');
console.log('Public translation namespaces restored; Paths layout selector repaired.');
