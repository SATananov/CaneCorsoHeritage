import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/i18n/translations.js', 'utf8');

assert.ok(
    source.includes("homeText: 'Home is the starting point. It introduces Cane Corso Heritage"),
);
assert.ok(
    source.includes("homeText: 'Начало е отправната точка. Представя Cane Corso Heritage"),
);
assert.ok(
    source.includes("homeText: 'La Home è il punto di partenza. Presenta Cane Corso Heritage"),
);

console.log('PASS: HELP GUIDE WORDING 02');
