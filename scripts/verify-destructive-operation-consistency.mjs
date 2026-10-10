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

function createAdminStorySupabase({
    storyResult,
    filesResult = { data: [{ storage_path: 'path/file.webp' }], error: null },
    storageResult = { error: null },
}) {
    const calls = [];

    return {
        calls,
        from(table) {
            calls.push(`db:${table}`);

            if (table === 'user_files') {
                return {
                    select(column) {
                        assert.equal(column, 'storage_path');
                        calls.push('files:select');
                        return {
                            eq(actualColumn, value) {
                                assert.equal(actualColumn, 'story_id');
                                assert.equal(value, 'story-1');
                                calls.push('files:eq');
                                return Promise.resolve(filesResult);
                            },
                        };
                    },
                };
            }

            assert.equal(table, 'stories');

            return {
                delete(options) {
                    assert.deepEqual(options, { count: 'exact' });
                    calls.push('story:delete');
                    return {
                        eq(column, value) {
                            assert.equal(column, 'id');
                            assert.equal(value, 'story-1');
                            calls.push('story:eq');
                            return Promise.resolve(storyResult);
                        },
                    };
                },
            };
        },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                calls.push(`storage:${bucket}`);
                return {
                    async remove(paths) {
                        assert.deepEqual(paths, ['path/file.webp']);
                        calls.push('storage:remove');
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
    const successResult = await success.deleteUserFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.ok(successSupabase.calls.indexOf('db:eq') < successSupabase.calls.indexOf('storage:remove'));
    assert.deepEqual(successResult, {
        deleted: true,
        cleanupPending: false,
        cleanupError: null,
    });

    const cleanupFailureSupabase = createDeleteSupabase({
        metadataResult: { count: 1, error: null },
        storageResult: { error: { message: 'storage cleanup failed' } },
    });
    const cleanupFailure = loadService('src/services/fileService.js', ['deleteUserFile'], {
        supabase: cleanupFailureSupabase,
    });
    const cleanupResult = await cleanupFailure.deleteUserFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.deepEqual(cleanupResult, {
        deleted: true,
        cleanupPending: true,
        cleanupError: 'storage cleanup failed',
    });
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
    const successResult = await success.adminDeleteFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.ok(successSupabase.calls.indexOf('db:eq') < successSupabase.calls.indexOf('storage:remove'));
    assert.deepEqual(successResult, {
        deleted: true,
        cleanupPending: false,
        cleanupError: null,
    });

    const cleanupFailureSupabase = createDeleteSupabase({
        metadataResult: { count: 1, error: null },
        storageResult: { error: { message: 'admin storage cleanup failed' } },
    });
    const cleanupFailure = loadService('src/services/adminService.js', ['adminDeleteFile'], {
        supabase: cleanupFailureSupabase,
    });
    const cleanupResult = await cleanupFailure.adminDeleteFile({ id: 'file-1', storage_path: 'path/file.webp' });
    assert.deepEqual(cleanupResult, {
        deleted: true,
        cleanupPending: true,
        cleanupError: 'admin storage cleanup failed',
    });
}

async function verifyAdminStoryDelete() {
    const dbFailureSupabase = createAdminStorySupabase({
        storyResult: { count: 0, error: null },
    });

    const dbFailure = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: dbFailureSupabase,
    });

    await assert.rejects(
        () => dbFailure.adminDeleteStory('story-1'),
        /Story deletion did not affect exactly one row\./,
    );

    assert.doesNotMatch(
        dbFailureSupabase.calls.join('|'),
        /storage:/,
        'Admin Story storage cleanup must not run when Story deletion fails',
    );

    const successSupabase = createAdminStorySupabase({
        storyResult: { count: 1, error: null },
    });

    const success = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: successSupabase,
    });

    const successResult = await success.adminDeleteStory('story-1');

    assert.deepEqual(successResult, {
        deleted: true,
        cleanupPending: false,
        cleanupError: null,
    });

    assert.ok(
        successSupabase.calls.indexOf('story:eq')
        < successSupabase.calls.indexOf('storage:remove'),
    );

    const cleanupFailureSupabase = createAdminStorySupabase({
        storyResult: { count: 1, error: null },
        storageResult: { error: { message: 'story cleanup failed' } },
    });

    const cleanupFailure = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: cleanupFailureSupabase,
    });

    const cleanupResult = await cleanupFailure.adminDeleteStory('story-1');

    assert.deepEqual(cleanupResult, {
        deleted: true,
        cleanupPending: true,
        cleanupError: 'story cleanup failed',
    });
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

    assert.doesNotMatch(
        dbFailureSupabase.calls.join('|'),
        /storage:/,
        'Avatar storage cleanup must not run when profile update fails',
    );

    const successSupabase = createProfileSupabase({
        metadataResult: { count: 1, error: null },
    });

    const success = loadService('src/services/profileService.js', ['removeProfileAvatar'], {
        supabase: successSupabase,
    });

    const successResult = await success.removeProfileAvatar(
        'user-1',
        'path/file.webp',
    );

    assert.ok(
        successSupabase.calls.indexOf('db:eq')
        < successSupabase.calls.indexOf('storage:remove'),
    );

    assert.deepEqual(successResult, {
        removed: true,
        cleanupPending: false,
        cleanupError: null,
    });

    const cleanupFailureSupabase = createProfileSupabase({
        metadataResult: { count: 1, error: null },
        storageResult: { error: { message: 'avatar cleanup failed' } },
    });

    const cleanupFailure = loadService('src/services/profileService.js', ['removeProfileAvatar'], {
        supabase: cleanupFailureSupabase,
    });

    const cleanupResult = await cleanupFailure.removeProfileAvatar(
        'user-1',
        'path/file.webp',
    );

    assert.deepEqual(cleanupResult, {
        removed: true,
        cleanupPending: true,
        cleanupError: 'avatar cleanup failed',
    });
}

const adminPage = read('src/pages/AdminPage.jsx');
const profileEditor = read('src/components/ProfileEditor.jsx');

assert.ok(
    adminPage.includes('const result = await action();')
    && adminPage.includes("result?.cleanupPending ? t('cleanupPending') : successMessage"),
    'Admin UI distinguishes committed cleanup warnings from failed actions',
);

assert.ok(
    profileEditor.includes(
        'const result = await removeProfileAvatar(profile.id, profile.avatar_path);',
    )
    && profileEditor.includes("t('avatarRemovedCleanupPending')")
    && profileEditor.includes('notifyProfileRefresh(profile.id);'),
    'Profile UI refreshes committed avatar removal and surfaces cleanup warning',
);

await verifyUserFileDelete();
await verifyAdminFileDelete();
await verifyAdminStoryDelete();
await verifyAvatarRemoval();

console.log('PASS: FIX 17 destructive operation consistency');
