import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const envExample = read('.env.example');
const gitignore = read('.gitignore');
const readme = read('README.md');
const supabaseClient = read('src/lib/supabaseClient.js');

const expectedVariables = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const envLines = envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

assert.deepEqual(
    envLines,
    expectedVariables.map((name) => `${name}=`),
    '.env.example must contain only the two required Supabase variables with empty values',
);

for (const variable of expectedVariables) {
    assert.ok(
        supabaseClient.includes(`import.meta.env.${variable}`),
        `Supabase client must read ${variable}`,
    );

    assert.ok(
        readme.includes(variable),
        `README must document ${variable}`,
    );
}

assert.match(
    gitignore,
    /^\*\.local$/m,
    '.gitignore must keep .env.local ignored through *.local',
);

assert.ok(
    readme.includes('npm install'),
    'README must document npm install',
);

assert.ok(
    readme.includes('npm run dev'),
    'README must document npm run dev',
);

assert.doesNotMatch(
    envExample,
    /https?:\/\/|eyJ[a-zA-Z0-9_-]{20,}/,
    '.env.example must not contain a real URL or JWT-like credential',
);

const trackedSourceFiles = [
    'src/lib/supabaseClient.js',
    'src/context/AuthProvider.jsx',
    'src/services/adminService.js',
    'src/services/commentReactionService.js',
    'src/services/commentService.js',
    'src/services/fileRatingService.js',
    'src/services/fileService.js',
    'src/services/heritageRatingService.js',
    'src/services/heritageService.js',
    'src/services/heritageTranslationService.js',
    'src/services/profileService.js',
    'src/services/ratingService.js',
    'src/services/storyService.js',
    'src/services/storyTranslationService.js',
    'src/pages/UpdatePasswordPage.jsx',
];

for (const path of trackedSourceFiles) {
    const source = read(path);

    assert.doesNotMatch(
        source,
        /https:\/\/[a-z0-9-]+\.supabase\.co/i,
        `${path} must not contain a hardcoded Supabase project URL`,
    );

    assert.doesNotMatch(
        source,
        /eyJ[a-zA-Z0-9_-]{20,}/,
        `${path} must not contain a JWT-like Supabase credential`,
    );
}

console.log('PASS: FIX 15 reproducible environment setup');
