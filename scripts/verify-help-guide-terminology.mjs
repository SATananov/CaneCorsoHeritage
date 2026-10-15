import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/i18n/translations.js', 'utf8');

assert.ok(source.includes("guideKicker: 'Cane Corso Heritage guide'"));
assert.ok(source.includes("guideKicker: 'Ръководство за Cane Corso Heritage'"));
assert.ok(source.includes("guideKicker: 'Guida a Cane Corso Heritage'"));

assert.ok(
    source.includes('за какво служи всяка част от Cane Corso Heritage'),
    'Bulgarian guide intro names Cane Corso Heritage directly',
);

assert.ok(
    source.includes('според правилата за достъп в Cane Corso Heritage'),
    'Bulgarian privacy note avoids calling this module the whole platform',
);

assert.ok(
    !source.includes("guideKicker: 'Ръководство за платформата'"),
    'old Bulgarian platform label is gone',
);

console.log('PASS: HELP GUIDE TERMINOLOGY 01');
