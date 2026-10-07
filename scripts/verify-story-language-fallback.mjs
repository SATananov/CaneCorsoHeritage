import fs from 'node:fs';

const service = fs.readFileSync('src/services/storyTranslationService.js', 'utf8');
const fn = fs.readFileSync('supabase/functions/translate-story/index.ts', 'utf8');

const checks = [
  ['client defaults missing Story language to EN', service.includes("story?.original_language || 'en'")],
  ['collection candidate routing uses normalized source language', service.includes('sourceLanguage !== language')],
  ['collection render routing uses normalized source language', service.includes('sourceLanguage === language')],
  ['Edge Function defaults missing Story language to EN', fn.includes("story.original_language || 'en'")],
  ['Edge Function uses normalized source language for original passthrough', fn.includes('sourceLanguage === targetLanguage')],
  ['DeepL source_lang uses normalized source language', fn.includes('DEEPL_LANGUAGES[sourceLanguage]')],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('STORY LANGUAGE FALLBACK FIX 01: PASS');
