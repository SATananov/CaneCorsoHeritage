import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261015170500_document_file_ratings.sql';
const sql = readFileSync(migrationPath, 'utf8');

for (const policy of [
    'file_ratings_insert_own',
    'file_ratings_public_read',
    'file_ratings_update_own',
]) {
    assert.match(sql, new RegExp(`DROP POLICY IF EXISTS "${policy}"`, 'i'));
    assert.match(sql, new RegExp(`CREATE POLICY "${policy}"`, 'i'));
}

for (const mime of [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]) {
    assert.ok(sql.includes(`'${mime}'`), `missing document MIME: ${mime}`);
}

assert.ok(sql.includes("f.mime_type LIKE 'image/%'"));
assert.ok(sql.includes("f.mime_type LIKE 'audio/%'"));
assert.ok(sql.includes("f.mime_type LIKE 'video/%'"));
assert.ok(sql.includes("f.visibility = 'community'"));
assert.ok(sql.includes('f.user_id <> auth.uid()'));
assert.doesNotMatch(sql, /ALTER TABLE\s+public\.file_ratings/i);
assert.doesNotMatch(sql, /DROP TABLE/i);

console.log('PASS: document file rating policies extend media ratings without changing prior migrations.');
