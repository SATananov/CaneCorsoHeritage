import fs from 'node:fs';
import assert from 'node:assert/strict';

const localizedFiles = [
    'src/App.jsx',
    'src/pages/HelpPage.jsx',
    'src/pages/NotFoundPage.jsx',
    'src/pages/MyStoriesPage.jsx',
    'src/pages/MyFilesPage.jsx',
    'src/pages/UserDetailsPage.jsx',
    'src/pages/AdminPage.jsx',
    'src/components/AddStoryModal.jsx',
    'src/components/StoryDeleteModal.jsx',
    'src/components/GuestAccessPrompt.jsx',
    'src/components/ProfileEditor.jsx',
    'src/components/LanguageSwitcher.jsx',
    'src/components/Footer.jsx',
    'src/components/Hero.jsx',
    'src/routing/RequireAuth.jsx',
    'src/routing/RequireGuest.jsx',
    'src/routing/RequireAdmin.jsx',
    'src/routing/RequireCompleteProfile.jsx',
];

for (const file of localizedFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /getTranslation|\bt\(/, `${file}: expected translation wiring`);
}

const forbiddenRawUi = [
    />\s*(?:Loading page|Checking account|Checking administrator access|Checking profile setup)\.\.\.\s*</,
    />\s*(?:Private area|My Stories|My Files|Pending approvals|Administration|Page not found\.|Help topic)\s*</,
    />\s*(?:Login|Register|Approve|Reject|Restore|Deactivate|Reactivate|Delete Story)\s*</,
    /aria-label="(?:Language selection|Footer navigation|Administration navigation|Close member details|Close image preview|Close story form)"/,
];

for (const file of localizedFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenRawUi) {
        assert.doesNotMatch(source, pattern, `${file}: raw UI copy remains: ${pattern}`);
    }
}

const stories = fs.readFileSync('src/pages/MyStoriesPage.jsx', 'utf8');
assert.match(stories, /story\.title/, 'My Stories must render Supabase Story title unchanged.');
assert.match(stories, /story\.description/, 'My Stories must render Supabase Story description unchanged.');
assert.match(stories, /story\.visibility/, 'My Stories must derive translated UI from semantic visibility.');
assert.match(stories, /story\.moderation_status/, 'My Stories must derive translated UI from semantic moderation status.');

const files = fs.readFileSync('src/pages/MyFilesPage.jsx', 'utf8');
assert.match(files, /file\.file_name/, 'My Files must render Supabase file names unchanged.');
assert.match(files, /file\.visibility/, 'My Files must derive translated UI from semantic visibility.');
assert.match(files, /file\.moderation_status/, 'My Files must derive translated UI from semantic moderation status.');

const member = fs.readFileSync('src/pages/UserDetailsPage.jsx', 'utf8');
assert.match(member, /profile\.bio/, 'Member biography must remain Supabase content.');
assert.match(member, /story\.title/, 'Member Story title must remain Supabase content.');
assert.match(member, /story\.description/, 'Member Story description must remain Supabase content.');
assert.match(member, /file\.file_name/, 'Member file name must remain Supabase content.');

console.log('LANGUAGE FULL UI 03: PASS');
console.log('Private/admin/system UI uses EN/BG/IT translation wiring while Supabase user content remains presentation-only and unchanged.');
