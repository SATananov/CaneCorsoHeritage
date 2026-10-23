import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20261023130000_file_owner_edit_security.sql');
const fileService = read('src/services/fileService.js');
const adminService = read('src/services/adminService.js');
const modal = read('src/components/OwnerFileEditModal.jsx');
const ownerFileUi = read('src/i18n/ownerFileEditUi.js');
const readme = read('README.md');

assert.match(
    migration,
    /DROP POLICY IF EXISTS "admins can update all user files" ON public\.user_files;/,
);
assert.match(
    migration,
    /DROP POLICY IF EXISTS "user_files_storage_update_own" ON storage\.objects;/,
);
assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.admin_moderate_file\(/,
);
assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.owner_update_user_file_metadata\(/,
);
assert.match(
    migration,
    /WHERE id = target_file_id\s+AND user_id = auth\.uid\(\);/,
);
assert.match(
    adminService,
    /supabase\.rpc\('admin_moderate_file'/,
);
assert.match(
    fileService,
    /supabase\s*\.rpc\(\s*['"]owner_update_user_file_metadata['"]/,
);
assert.match(
    fileService,
    /reconciled\?\.storage_path === uploadedReplacementPath/,
);
assert.match(
    fileService,
    /FILE_UPDATE_AMBIGUOUS/,
    'ambiguous file updates must use the dedicated fail-safe error code',
);
assert.match(
    fileService,
    /kept for safety/,
    'ambiguous file updates must keep the replacement object for safety',
);
assert.match(
    modal,
    /updated\?\.cleanupPending/,
);
assert.match(
    modal,
    /ui\.cleanupWarning/,
);

for (const path of [
    'src/pages/MyFilesPage.jsx',
    'src/pages/GalleryPage.jsx',
    'src/pages/DocumentsPage.jsx',
    'src/pages/UserDetailsPage.jsx',
]) {
    const source = read(path);
    assert.doesNotMatch(source, />\s*EDIT\s*</);
}

for (const language of ['en', 'bg', 'it']) {
    const blockPattern = new RegExp(
        language + ": \\{[\\s\\S]*?edit: '[^']+'",
    );

    assert.match(
        ownerFileUi,
        blockPattern,
        `owner file edit label must exist for ${language}`,
    );
}

for (const pagePath of [
    'src/pages/GalleryPage.jsx',
    'src/pages/DocumentsPage.jsx',
    'src/pages/UserDetailsPage.jsx',
]) {
    const source = read(pagePath);

    assert.match(
        source,
        /getOwnerFileEditUi\(language\)\.edit/,
        `${pagePath} must use centralized owner-file edit localization`,
    );
}

assert.ok(
    readme.includes('src/context/ToastProvider.jsx'),
    'README must point to the real ToastProvider path',
);
assert.ok(
    !readme.includes('src/components/ToastProvider.jsx'),
    'README must not keep the stale ToastProvider path',
);

console.log('FILE OWNER EDIT SECURITY 01: PASS');
