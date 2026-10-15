import fs from 'node:fs';

function read(path) {
    return fs.readFileSync(path, 'utf8');
}

const admin = read('src/components/admin/AdminStoriesSection.jsx');
const header = read('src/components/story/StoryHeader.jsx');
const adminService = read('src/services/adminService.js');
const storyService = read('src/services/storyService.js');
const migration = read('supabase/migrations/20261015054000_story_editorial_source.sql');

const checks = [
    ['Admin uses explicit editorial provenance', admin.includes('story.editorial_source')],
    ['Admin preserves missing-profile warning fallback', admin.includes("t('noLinkedProfile')")],
    ['Admin service fetches editorial_source', adminService.includes("const STORY_COLUMNS = 'id,title,author_id,editorial_source,")],
    ['Public Story header exposes editorial provenance', header.includes('story.editorial_source')],
    ['Public Story detail fetch includes all Story columns', storyService.includes('stories?select=*&id=eq.')],
    ['Migration adds editorial_source', migration.includes('add column if not exists editorial_source text')],
    ['Migration labels only unlinked current stories', migration.includes('not exists') && migration.includes('public.profiles')],
    ['Migration stores USG provenance', migration.includes('USG — Unico Suo Genere')],
];

let failed = false;
for (const [label, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
    failed ||= !ok;
}

if (failed) process.exit(1);
