import fs from 'node:fs';

const section = fs.readFileSync('src/components/StoriesPreviewSection.jsx', 'utf8');
const translations = fs.readFileSync('src/i18n/translations.js', 'utf8');

const checks = [
  ['legacy editorial titles are explicitly identified', section.includes('LEGACY_EDITORIAL_STORY_TITLES')],
  ['legacy editorial rows are filtered before machine translation', section.includes('const communityStories = data.filter(') && section.includes('!LEGACY_EDITORIAL_STORY_TITLES.has(story.title)')],
  ['only real community stories enter machine translation', /localizeStoryCollection\(\s*communityStories,\s*language,\s*\)/.test(section)],
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
  console.error(`STATIC STORY CARDS LOCALIZATION FIX 01: FAIL (${failed})`);
  process.exit(1);
}

console.log('STATIC STORY CARDS LOCALIZATION FIX 01: PASS');
console.log('Legacy editorial Story titles remain identified for exclusion; only real community Stories use machine translation and the enriched community catalog is rendered.');
