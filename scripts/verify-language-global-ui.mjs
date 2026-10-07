import fs from 'node:fs';
import assert from 'node:assert/strict';

const requiredFiles = [
    'src/components/AuthActions.jsx',
    'src/components/Header.jsx',
    'src/components/HeritageSlider.jsx',
    'src/components/HeritageSlide.jsx',
    'src/components/PathsSection.jsx',
];

for (const file of requiredFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, />\s*Login\s*</, `${file}: raw Login label remains`);
    assert.doesNotMatch(source, />\s*Register\s*</, `${file}: raw Register label remains`);
    assert.doesNotMatch(source, />\s*Logout\s*</, `${file}: raw Logout label remains`);
}

const slider = fs.readFileSync('src/components/HeritageSlider.jsx', 'utf8');
assert.doesNotMatch(slider, /Character\. Loyalty\. Bond\./, 'Raw slider title remains');
assert.doesNotMatch(slider, /Discover Cane Corso Heritage/, 'Raw slider topline remains');

const paths = fs.readFileSync('src/components/PathsSection.jsx', 'utf8');
assert.doesNotMatch(paths, /Choose where you want to begin\./, 'Raw Paths heading remains');

const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');
const matches = translations.match(/\bglobalUi:\s*\{/g) ?? [];
assert.equal(matches.length, 3, 'globalUi must exist for EN/BG/IT');

console.log('LANGUAGE GLOBAL UI 02C: PASS');
console.log('Global header / auth / slider / home cards are wired to EN / BG / IT.');
