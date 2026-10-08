import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function loadService(path, functionNames, dependencies = {}) {
    let source = read(path).replace(/^\uFEFF/, '');
    source = source.replace(/^import\s+.*?;\r?\n/gm, '');
    source = source.replace(/export\s+async\s+function/g, 'async function');
    source = source.replace(/export\s+function/g, 'function');
    source = source.replace(/import\.meta\.env\.VITE_SUPABASE_URL/g, JSON.stringify('https://example.supabase.co'));
    source = source.replace(/import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/g, JSON.stringify('test-publishable-key'));

    const names = Object.keys(dependencies);
    const values = Object.values(dependencies);
    const factory = new Function(
        ...names,
        `"use strict";\n${source}\nreturn { ${functionNames.join(', ')} };`,
    );

    return factory(...values);
}

function createDeleteSupabase({ metadataResult, storageResult = { error: null }, table = 'user_files', bucket = 'user-files', expectedId = 'file-1' }) {
    const calls = [];
    return {
        calls,
        from(actualTable) {
            calls.push(`db:${actualTable}`);
            assert.equal(actualTable, table);
            return {
                delete(options) {
                    assert.deepEqual(options, { count: 'exact' });
                    calls.push('db:delete');
                    return {
                        eq(column, value) {
                            assert.equal(column, 'id');
                            assert.equal(value, expectedId);
                            calls.push('db:eq');
                            return Promise.resolve(metadataResult);
                        },
                    };
                },
            };
        },
        storage: {
            from(actualBucket) {
                calls.push(`storage:${actualBucket}`);
                assert.equal(actualBucket, bucket);
                return {
                    async remove(paths) {
                        calls.push('storage:remove');
                        assert.deepEqual(paths, ['path/file.webp']);
                        return storageResult;
                    },
                };
            },
        },
    };
}

function createProfileSupabase({ metadataResult, storageResult = { error: null } }) {
    const calls = [];
    return {
        calls,
        from(table) {
            calls.push(`db:${table}`);
            assert.equal(table, 'profiles');
            return {
                update(payload, options) {
                    calls.push('db:update');
                    assert.equal(payload.avatar_path, null);
                    assert.equal(payload.avatar_url, null);
                    assert.deepEqual(options, { count: 'exact' });
                    return {
                        eq(column, value) {
                            assert.equal(column, 'id');
                            assert.equal(value, 'user-1');
                            calls.push('db:eq');
                            return Promise.resolve(metadataResult);
                        },
                    };
                },
            };
        },
        storage: {
            from(bucket) {
                calls.push(`storage:${bucket}`);
                assert.equal(bucket, 'avatars');
                return {
                    async remove(paths) {
                        calls.push('storage:remove');
                        assert.deepEqual(paths, ['path/file.webp']);
                        return storageResult;
                    },
                };
            },
        },
    };
}

async function verifyUserFileDelete() {
    const dbFailureSupabase = createDeleteSupabase({
        metadataResult: { count: 0, error: null },
    });
    const dbFailure = loadService('src/services/fileService.js', ['deleteUserFile'], {
        supabase: dbFailureSupabase,
    });
    await assert.rejects(
        () => dbFailure.deleteUserFile({ id: 'file-1', storage_path: 'path/file.webp' }),
        /File deletion did not affect exactly one row\./,
    );
    assert.doesNotMatch(dbFailureSupabase.calls.join('|'), /storage:/, 'Storage must not be touched when file metadata deletion fails');

    const successSupabase = createDeleteSupabase({
        metadataResult: { count: 1, error: null },
    });
    const success = loadService('src/services/fileService.js', ['deleteUserFile'], {
        supabase: successSupabase,
    });
    await success.deleteUserFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.ok(successSupabase.calls.indexOf('db:eq') < successSupabase.calls.indexOf('storage:remove'));

    const cleanupFailureSupabase = createDeleteSupabase({
        metadataResult: { count: 1, error: null },
        storageResult: { error: { message: 'storage cleanup failed' } },
    });
    const cleanupFailure = loadService('src/services/fileService.js', ['deleteUserFile'], {
        supabase: cleanupFailureSupabase,
    });
    await assert.rejects(
        () => cleanupFailure.deleteUserFile({ id: 'file-1', storage_path: 'path/file.webp' }),
        /storage cleanup failed/,
    );
}

async function verifyAdminFileDelete() {
    const dbFailureSupabase = createDeleteSupabase({
        metadataResult: { count: 0, error: null },
    });
    const dbFailure = loadService('src/services/adminService.js', ['adminDeleteFile'], {
        supabase: dbFailureSupabase,
    });
    await assert.rejects(
        () => dbFailure.adminDeleteFile({ id: 'file-1', storage_path: 'path/file.webp' }),
        /File deletion did not affect exactly one row\./,
    );
    assert.doesNotMatch(dbFailureSupabase.calls.join('|'), /storage:/, 'Admin storage cleanup must not run when metadata deletion fails');

    const successSupabase = createDeleteSupabase({
        metadataResult: { count: 1, error: null },
    });
    const success = loadService('src/services/adminService.js', ['adminDeleteFile'], {
        supabase: successSupabase,
    });
    await success.adminDeleteFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.ok(successSupabase.calls.indexOf('db:eq') < successSupabase.calls.indexOf('storage:remove'));
}

async function verifyAvatarRemoval() {
    const dbFailureSupabase = createProfileSupabase({
        metadataResult: { count: 0, error: null },
    });
    const dbFailure = loadService('src/services/profileService.js', ['removeProfileAvatar'], {
        supabase: dbFailureSupabase,
    });
    await assert.rejects(
        () => dbFailure.removeProfileAvatar('user-1', 'path/file.webp'),
        /Avatar removal did not update the profile row\./,
    );
    assert.doesNotMatch(dbFailureSupabase.calls.join('|'), /storage:/, 'Avatar storage cleanup must not run when profile update fails');

    const successSupabase = createProfileSupabase({
        metadataResult: { count: 1, error: null },
    });
    const success = loadService('src/services/profileService.js', ['removeProfileAvatar'], {
        supabase: successSupabase,
    });
    await success.removeProfileAvatar('user-1', 'path/file.webp');
    assert.ok(successSupabase.calls.indexOf('db:eq') < successSupabase.calls.indexOf('storage:remove'));

    const cleanupFailureSupabase = createProfileSupabase({
        metadataResult: { count: 1, error: null },
        storageResult: { error: { message: 'avatar cleanup failed' } },
    });
    const cleanupFailure = loadService('src/services/profileService.js', ['removeProfileAvatar'], {
        supabase: cleanupFailureSupabase,
    });
    await assert.rejects(
        () => cleanupFailure.removeProfileAvatar('user-1', 'path/file.webp'),
        /avatar cleanup failed/,
    );
}

await verifyUserFileDelete();
await verifyAdminFileDelete();
await verifyAvatarRemoval();

console.log('PASS: FIX 17 destructive operation consistency');
