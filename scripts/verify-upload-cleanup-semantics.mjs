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

function createFileUploadSupabase({ metadataError = null, cleanupError = null }) {
    const calls = [];
    let uploadedPath = null;

    return {
        calls,
        auth: {
            async getUser() {
                calls.push('auth:getUser');
                return { data: { user: { id: 'user-1' } }, error: null };
            },
        },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                return {
                    async upload(path) {
                        calls.push('storage:upload');
                        uploadedPath = path;
                        return { error: null };
                    },
                    async remove(paths) {
                        calls.push('storage:remove');
                        assert.deepEqual(paths, [uploadedPath]);
                        return { error: cleanupError };
                    },
                };
            },
        },
        from(table) {
            assert.equal(table, 'user_files');
            return {
                insert(row) {
                    calls.push('db:insert');
                    assert.equal(row.user_id, 'user-1');
                    assert.equal(row.storage_path, uploadedPath);
                    return {
                        select() {
                            return {
                                async single() {
                                    calls.push('db:single');
                                    if (metadataError) {
                                        return { data: null, error: metadataError };
                                    }
                                    return { data: { id: 'file-1', ...row }, error: null };
                                },
                            };
                        },
                    };
                },
            };
        },
    };
}

function createAvatarSupabase({ profileError = null, profileCount = 1, cleanupError = null }) {
    const calls = [];
    let uploadedPath = null;

    return {
        calls,
        storage: {
            from(bucket) {
                assert.equal(bucket, 'avatars');
                return {
                    async upload(path) {
                        calls.push('storage:upload');
                        uploadedPath = path;
                        return { error: null };
                    },
                    getPublicUrl(path) {
                        calls.push('storage:getPublicUrl');
                        assert.equal(path, uploadedPath);
                        return { data: { publicUrl: `https://cdn.example/${path}` } };
                    },
                    async remove(paths) {
                        calls.push('storage:remove');
                        assert.deepEqual(paths, [uploadedPath]);
                        return { error: cleanupError };
                    },
                };
            },
        },
        from(table) {
            assert.equal(table, 'profiles');
            return {
                update(payload, options) {
                    calls.push('db:update');
                    assert.equal(payload.avatar_path, uploadedPath);
                    assert.deepEqual(options, { count: 'exact' });
                    return {
                        async eq(column, value) {
                            calls.push('db:eq');
                            assert.equal(column, 'id');
                            assert.equal(value, 'user-1');
                            return { count: profileCount, error: profileError };
                        },
                    };
                },
            };
        },
    };
}

async function verifyUserFileRollback() {
    const file = { name: 'photo.jpg', type: 'image/jpeg', size: 1024 };

    const cleanupSuccessSupabase = createFileUploadSupabase({
        metadataError: { message: 'metadata failed' },
    });
    const cleanupSuccess = loadService('src/services/fileService.js', ['uploadUserFiles'], {
        supabase: cleanupSuccessSupabase,
    });
    await assert.rejects(
        () => cleanupSuccess.uploadUserFiles([file]),
        /^Error: metadata failed$/,
    );
    assert.deepEqual(
        cleanupSuccessSupabase.calls.slice(-2),
        ['db:single', 'storage:remove'],
        'Failed metadata insert must attempt rollback cleanup',
    );

    const cleanupFailureSupabase = createFileUploadSupabase({
        metadataError: { message: 'metadata failed' },
        cleanupError: { message: 'cleanup failed' },
    });
    const cleanupFailure = loadService('src/services/fileService.js', ['uploadUserFiles'], {
        supabase: cleanupFailureSupabase,
    });
    await assert.rejects(
        () => cleanupFailure.uploadUserFiles([file]),
        /metadata failed.*uploaded file could not be cleaned up: cleanup failed/i,
    );

    const successSupabase = createFileUploadSupabase({});
    const success = loadService('src/services/fileService.js', ['uploadUserFiles'], {
        supabase: successSupabase,
    });
    const result = await success.uploadUserFiles([file]);
    assert.equal(result.length, 1);
    assert.doesNotMatch(successSupabase.calls.join('|'), /storage:remove/, 'Successful upload must not run rollback cleanup');
}

async function verifyAvatarRollback() {
    const file = { name: 'avatar.jpg', type: 'image/jpeg', size: 1024 };

    const cleanupSuccessSupabase = createAvatarSupabase({
        profileError: { message: 'profile update failed' },
        profileCount: null,
    });
    const cleanupSuccess = loadService('src/services/profileService.js', ['uploadProfileAvatar'], {
        supabase: cleanupSuccessSupabase,
    });
    await assert.rejects(
        () => cleanupSuccess.uploadProfileAvatar('user-1', file, null),
        /^Error: profile update failed$/,
    );
    assert.ok(
        cleanupSuccessSupabase.calls.indexOf('db:eq') < cleanupSuccessSupabase.calls.indexOf('storage:remove'),
        'Avatar rollback cleanup must run only after profile update failure',
    );

    const cleanupFailureSupabase = createAvatarSupabase({
        profileError: { message: 'profile update failed' },
        profileCount: null,
        cleanupError: { message: 'avatar cleanup failed' },
    });
    const cleanupFailure = loadService('src/services/profileService.js', ['uploadProfileAvatar'], {
        supabase: cleanupFailureSupabase,
    });
    await assert.rejects(
        () => cleanupFailure.uploadProfileAvatar('user-1', file, null),
        /profile update failed.*uploaded avatar could not be cleaned up: avatar cleanup failed/i,
    );

    const zeroRowSupabase = createAvatarSupabase({
        profileCount: 0,
        cleanupError: { message: 'avatar cleanup failed' },
    });
    const zeroRowFailure = loadService('src/services/profileService.js', ['uploadProfileAvatar'], {
        supabase: zeroRowSupabase,
    });
    await assert.rejects(
        () => zeroRowFailure.uploadProfileAvatar('user-1', file, null),
        /profile was not updated.*uploaded avatar could not be cleaned up: avatar cleanup failed/i,
    );

    const successSupabase = createAvatarSupabase({ profileCount: 1 });
    const success = loadService('src/services/profileService.js', ['uploadProfileAvatar'], {
        supabase: successSupabase,
    });
    await success.uploadProfileAvatar('user-1', file, null);
    assert.doesNotMatch(successSupabase.calls.join('|'), /storage:remove/, 'Successful avatar upload must not run rollback cleanup');
}

await verifyUserFileRollback();
await verifyAvatarRollback();

console.log('PASS: FIX 20 upload cleanup failure semantics');
