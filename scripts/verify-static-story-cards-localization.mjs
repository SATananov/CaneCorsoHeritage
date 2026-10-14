import fs from 'node:fs';

const section = fs.readFileSync('src/components/StoriesPreviewSection.jsx', 'utf8');
const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');

const checks = [
  ['community catalog does not exclude records by title', !section.includes('LEGACY_EDITORIAL_STORY_TITLES') && !section.includes('.has(story.title)')],
  ['all approved community stories enter machine translation', /localizeStoryCollection\(\s*data,\s*language,\s*\)/.test(section)],
  ['localized community Story catalog is committed after catalog enrichment', section.includes('setStories(enrichedStories)')],
  ['EN static story keys exist',
    translations.includes("fallbackOriginsTitle: 'Where every story begins'") &&
    translations.includes("fallbackLoyaltyTitle: 'The bond that stays'") &&
    translations.includes("fallbackLegacyTitle: 'Stories carried forward'")],
  ['BG static story keys exist', translations.includes("fallbackOriginsTitle: 'Откъдето започва всяка история'")],
  ['IT static story keys exist', translations.includes("fallbackOriginsTitle: 'Dove inizia ogni storia'")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`STATIC STORY CARDS LOCALIZATION: FAIL (${failed})`);
  process.exit(1);
}

console.log('STATIC STORY CARDS LOCALIZATION: PASS');
console.log('Approved community Stories are never excluded by title; all records use machine translation as needed and the enriched community catalog is rendered.');
