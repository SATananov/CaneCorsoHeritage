import fs from 'node:fs';

const files = [
    'src/i18n/translations.js',
    'src/i18n/applicationUi.js',
];

const decoder = new TextDecoder('windows-1251');
const utf8 = new TextDecoder('utf-8', { fatal: true });

const reverse = new Map();

for (let byte = 0; byte <= 255; byte += 1) {
    const char = decoder.decode(Uint8Array.of(byte));

    if (char !== '\uFFFD' && !reverse.has(char)) {
        reverse.set(char, byte);
    }
}

function repairable(value) {
    const bytes = [];

    for (const char of value) {
        const byte = reverse.get(char);

        if (byte === undefined) {
            return null;
        }

        bytes.push(byte);
    }

    try {
        const candidate = utf8.decode(Uint8Array.from(bytes));
        return candidate !== value ? candidate : null;
    } catch {
        return null;
    }
}

let total = 0;

for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let count = 0;

    for (const match of text.matchAll(/'((?:\\.|[^'\\])*)'/g)) {
        const candidate = repairable(match[1]);

        if (candidate) {
            count += 1;
            total += 1;
            console.log(`${file}: ${JSON.stringify(match[1])}`);
            console.log(`  -> ${JSON.stringify(candidate)}`);
        }
    }

    console.log(`${file}: remaining repairable strings = ${count}`);
}

console.log(`TOTAL remaining repairable strings = ${total}`);
