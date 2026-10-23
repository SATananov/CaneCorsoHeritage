import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20261023143000_file_storage_integrity.sql');
const service = read('src/services/fileService.js');
const modal = read('src/components/OwnerFileEditModal.jsx');
const ui = read('src/i18n/ownerFileEditUi.js');
const readme = read('README.md');

assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.user_file_storage_object_is_unreferenced[\s\S]*?SECURITY DEFINER/i,
    'unreferenced-object helper must be SECURITY DEFINER',
);

assert.match(
    migration,
    /CREATE POLICY "user_files_storage_delete_own"[\s\S]*?user_file_storage_object_is_unreferenced\(name\)/,
    'owner Storage DELETE must require an unreferenced object',
);

assert.match(
    migration,
    /CREATE POLICY "admins can delete user file storage"[\s\S]*?user_file_storage_object_is_unreferenced\(name\)/,
    'admin Storage DELETE must require an unreferenced object',
);

assert.match(
    migration,
    /CREATE POLICY "active members can update avatar storage"[\s\S]*?AS RESTRICTIVE[\s\S]*?bucket_id <> 'avatars'[\s\S]*?is_active_member\(\)/,
    'avatar UPDATE must retain active-account restriction',
);

const downloadFunction = migration.match(
    /CREATE OR REPLACE FUNCTION public\.set_user_file_download_permission[\s\S]*?\$\$;/,
)?.[0] ?? '';

assert.ok(downloadFunction, 'download permission RPC must be redefined');
assert.match(
    downloadFunction,
    /WHERE id = p_file_id\s+AND user_id = auth\.uid\(\)/,
    'download permission RPC must be owner-only',
);
assert.doesNotMatch(
    downloadFunction,
    /user_id\s*=\s*auth\.uid\(\)\s+OR\s+public\.is_admin\(\)/i,
    'download permission RPC must not restore an admin ownership override',
);

assert.match(
    service,
    /FILE_UPDATE_AMBIGUOUS/,
    'file service must expose a dedicated ambiguous update code',
);
assert.match(
    modal,
    /ambiguousSaveError/,
    'owner edit modal must surface the localized ambiguous-update warning',
);
assert.equal(
    (ui.match(/ambiguousSaveError:/g) ?? []).length,
    3,
    'ambiguous save warning must exist exactly once in EN/BG/IT',
);
assert.match(
    readme,
    /all 97 project verifier scripts/i,
    'README must report the current 97-script verifier suite',
);

console.log('FILE STORAGE INTEGRITY 01: PASS');
