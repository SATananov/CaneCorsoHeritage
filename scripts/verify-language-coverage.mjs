import assert from 'node:assert/strict';
import { translations } from '../src/i18n/translations.js';

const REQUIRED_LANGUAGES = ['en', 'bg', 'it'];

function isPlainObject(value) {
    return (
        value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
    );
}

function collectLeafPaths(value, prefix = '') {
    if (!isPlainObject(value)) {
        return [prefix];
    }

    return Object.entries(value).flatMap(([key, child]) => {
        const next = prefix ? `${prefix}.${key}` : key;
        return collectLeafPaths(child, next);
    });
}

function readPath(object, path) {
    return path.split('.').reduce(
        (current, key) => current?.[key],
        object,
    );
}

function validateLanguageShape(language, referencePaths) {
    const locale = translations[language];

    assert.ok(
        isPlainObject(locale),
        `Missing translation object for language "${language}".`,
    );

    const missing = [];
    const empty = [];
    const wrongType = [];

    for (const path of referencePaths) {
        const value = readPath(locale, path);

        if (value === undefined) {
            missing.push(path);
            continue;
        }

        if (typeof value !== 'string') {
            wrongType.push(`${path} (${typeof value})`);
            continue;
        }

        if (value.trim().length === 0) {
            empty.push(path);
        }
    }

    const extra = collectLeafPaths(locale)
        .filter((path) => !referencePaths.includes(path));

    return {
        language,
        missing,
        empty,
        wrongType,
        extra,
    };
}

assert.ok(
    isPlainObject(translations.en),
    'English translations are required as the canonical reference.',
);

for (const language of REQUIRED_LANGUAGES) {
    assert.ok(
        Object.hasOwn(translations, language),
        `Required language "${language}" is missing.`,
    );
}

const referencePaths = collectLeafPaths(translations.en);
const reports = REQUIRED_LANGUAGES
    .filter((language) => language !== 'en')
    .map((language) => validateLanguageShape(language, referencePaths));

let failed = false;

console.log('=== LANGUAGE COVERAGE 01 ===');
console.log(`Canonical language : EN`);
console.log(`Required languages : ${REQUIRED_LANGUAGES.map((item) => item.toUpperCase()).join(' / ')}`);
console.log(`Canonical text keys: ${referencePaths.length}`);
console.log('');

for (const report of reports) {
    const label = report.language.toUpperCase();

    console.log(`${label} missing         : ${report.missing.length}`);
    console.log(`${label} empty           : ${report.empty.length}`);
    console.log(`${label} wrong type      : ${report.wrongType.length}`);
    console.log(`${label} extra keys      : ${report.extra.length}`);

    if (report.missing.length > 0) {
        failed = true;
        console.log(`  Missing: ${report.missing.join(', ')}`);
    }

    if (report.empty.length > 0) {
        failed = true;
        console.log(`  Empty: ${report.empty.join(', ')}`);
    }

    if (report.wrongType.length > 0) {
        failed = true;
        console.log(`  Wrong type: ${report.wrongType.join(', ')}`);
    }

    if (report.extra.length > 0) {
        failed = true;
        console.log(`  Extra: ${report.extra.join(', ')}`);
    }

    console.log('');
}

if (failed) {
    console.error('LANGUAGE COVERAGE 01: FAIL');
    console.error('Every EN text key must exist as a non-empty string in BG and IT, with no unmatched extra keys.');
    process.exit(1);
}

console.log('LANGUAGE COVERAGE 01: PASS');
console.log('EN / BG / IT have matching, non-empty translation keys.');
