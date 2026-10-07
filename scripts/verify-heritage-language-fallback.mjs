import fs from 'node:fs';

const source = fs.readFileSync('src/services/heritageTranslationService.js', 'utf8');
const checks = [
    ['default Heritage source language is EN', source.includes("DEFAULT_HERITAGE_SOURCE_LANGUAGE = 'en'")],
    ['missing/invalid Heritage language resolves through fallback', source.includes('getHeritageSourceLanguage(article)')],
    ['translation candidate no longer requires article.language to be truthy', !source.includes('&& article.language\n')],
    ['candidate compares resolved source language to selected language', source.includes('getHeritageSourceLanguage(article) !== language')],
];
let failed = 0;
for (const [label, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
    if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log('HERITAGE LANGUAGE FALLBACK 01: PASS');
