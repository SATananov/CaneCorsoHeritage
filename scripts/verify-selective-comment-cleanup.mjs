import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const gone = [
    ['vite.config.js', 'https://vite.dev/config/'],
    ['src/App.css', 'Final desktop hero alignment polish'],
    ['src/App.css', 'HELP GUIDE 01'],
    ['src/components/MessagesSection.module.css', 'MESSAGE EMOJI PICKER 01'],
    ['src/components/MessagesSection.module.css', 'PRIVATE MESSAGE ATTACHMENTS 01'],
    ['src/components/NotificationBell.module.css', 'NOTIFICATION FRIENDS IN MESSAGES 01'],
    ['src/pages/AdminPage.jsx', 'Preserve the dashboard publication contract'],
    ['src/pages/MyFilesPage.jsx', 'The service resolves only after both storage and metadata succeed.'],
];

for (const [file, phrase] of gone) {
    if (!existsSync(file)) continue;
    assert.ok(!readFileSync(file, 'utf8').includes(phrase), `${file}: redundant comment still present`);
}

const kept = [
    ['src/components/MessagesSection.jsx', 'Realtime delivery must remain usable if read-state sync fails.'],
    ['src/components/MediaRating.jsx', 'Lock synchronously, including before React renders the disabled buttons.'],
    ['src/services/messageService.js', 'Storage object names intentionally avoid the original user filename.'],
];

for (const [file, phrase] of kept) {
    if (!existsSync(file)) continue;
    assert.ok(readFileSync(file, 'utf8').includes(phrase), `${file}: useful rationale comment was removed`);
}

console.log('PASS: redundant marker comments removed; useful rationale comments preserved.');
