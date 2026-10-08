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

function storySupabase({ storageResult = { error: null }, events }) {
    return {
        auth: {
            async getSession() {
                return {
                    data: {
                        session: {
                            access_token: 'token-1',
                            user: { id: 'user-1' },
                        },
                    },
                    error: null,
                };
            },
        },
        from(table) {
            assert.equal(table, 'user_files');
            return {
                select(columns) {
                    assert.equal(columns, 'storage_path');
                    return {
                        eq(column, value) {
                            assert.equal(column, 'story_id');
                            assert.equal(value, 'story-1');
                            events.push('paths-read');
                            return Promise.resolve({
                                data: [
                                    { storage_path: 'user-1/a.webp' },
                                    { storage_path: 'user-1/b.pdf' },
                                ],
                                error: null,
                            });
                        },
                    };
                },
            };
        },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                return {
                    async remove(paths) {
                        events.push('storage-remove');
                        assert.deepEqual(paths, ['user-1/a.webp', 'user-1/b.pdf']);
                        return storageResult;
                    },
                };
            },
        },
    };
}

function storyFetch({ ok = true, rows = [{ id: 'story-1' }], events }) {
    return async (url, options) => {
        events.push('story-delete');
        assert.match(url, /\/rest\/v1\/stories\?/);
        assert.match(url, /id=eq\.story-1/);
        assert.match(url, /author_id=eq\.user-1/);
        assert.match(url, /&select=id$/);
        assert.equal(options.method, 'DELETE');
        assert.equal(options.headers.Prefer, 'return=representation');
        return {
            ok,
            async json() {
                return rows;
            },
        };
    };
}

function adminSupabase({
    deleteResult,
    storageResult = { error: null },
    events,
}) {
    return {
        from(table) {
            if (table === 'user_files') {
                return {
                    select(columns) {
                        assert.equal(columns, 'storage_path');
                        return {
                            eq(column, value) {
                                assert.equal(column, 'story_id');
                                assert.equal(value, 'story-1');
                                events.push('paths-read');
                                return Promise.resolve({
                                    data: [
                                        { storage_path: 'member/a.webp' },
                                        { storage_path: 'member/b.pdf' },
                                    ],
                                    error: null,
                                });
                            },
                        };
                    },
                };
            }

            assert.equal(table, 'stories');
            return {
                delete(options) {
                    assert.deepEqual(options, { count: 'exact' });
                    return {
                        eq(column, value) {
                            assert.equal(column, 'id');
                            assert.equal(value, 'story-1');
                            events.push('story-delete');
                            return Promise.resolve(deleteResult);
                        },
                    };
                },
            };
        },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                return {
                    async remove(paths) {
                        events.push('storage-remove');
                        assert.deepEqual(paths, ['member/a.webp', 'member/b.pdf']);
                        return storageResult;
                    },
                };
            },
        },
    };
}

async function verifyMemberStoryDelete() {
    const failedEvents = [];
    const failed = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: storySupabase({ events: failedEvents }),
        fetch: storyFetch({ ok: false, rows: [], events: failedEvents }),
    });

    await assert.rejects(
        () => failed.deleteStory('story-1'),
        /Unable to delete story\./,
    );
    assert.deepEqual(
        failedEvents,
        ['paths-read', 'story-delete'],
        'Member Story delete failure must not touch Storage',
    );

    const zeroEvents = [];
    const zero = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: storySupabase({ events: zeroEvents }),
        fetch: storyFetch({ rows: [], events: zeroEvents }),
    });

    await assert.rejects(
        () => zero.deleteStory('story-1'),
        /Story not found or not owned by this account\./,
    );
    assert.deepEqual(
        zeroEvents,
        ['paths-read', 'story-delete'],
        'Member zero-row Story delete must not touch Storage',
    );

    const successEvents = [];
    const success = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: storySupabase({ events: successEvents }),
        fetch: storyFetch({ events: successEvents }),
    });
    await success.deleteStory('story-1');
    assert.deepEqual(successEvents, ['paths-read', 'story-delete', 'storage-remove']);

    const cleanupEvents = [];
    const cleanupFailure = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: storySupabase({
            events: cleanupEvents,
            storageResult: { error: { message: 'member storage cleanup failed' } },
        }),
        fetch: storyFetch({ events: cleanupEvents }),
    });
    await assert.rejects(
        () => cleanupFailure.deleteStory('story-1'),
        /member storage cleanup failed/,
    );
    assert.deepEqual(cleanupEvents, ['paths-read', 'story-delete', 'storage-remove']);
}

async function verifyAdminStoryDelete() {
    const zeroEvents = [];
    const zero = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: adminSupabase({
            events: zeroEvents,
            deleteResult: { count: 0, error: null },
        }),
    });

    await assert.rejects(
        () => zero.adminDeleteStory('story-1'),
        /Story deletion did not affect exactly one row\./,
    );
    assert.deepEqual(
        zeroEvents,
        ['paths-read', 'story-delete'],
        'Admin zero-row Story delete must not touch Storage',
    );

    const errorEvents = [];
    const errorCase = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: adminSupabase({
            events: errorEvents,
            deleteResult: { count: null, error: { message: 'admin delete denied' } },
        }),
    });

    await assert.rejects(
        () => errorCase.adminDeleteStory('story-1'),
        /admin delete denied/,
    );
    assert.deepEqual(
        errorEvents,
        ['paths-read', 'story-delete'],
        'Admin Story delete error must not touch Storage',
    );

    const successEvents = [];
    const success = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: adminSupabase({
            events: successEvents,
            deleteResult: { count: 1, error: null },
        }),
    });
    await success.adminDeleteStory('story-1');
    assert.deepEqual(successEvents, ['paths-read', 'story-delete', 'storage-remove']);

    const cleanupEvents = [];
    const cleanupFailure = loadService('src/services/adminService.js', ['adminDeleteStory'], {
        supabase: adminSupabase({
            events: cleanupEvents,
            deleteResult: { count: 1, error: null },
            storageResult: { error: { message: 'admin storage cleanup failed' } },
        }),
    });
    await assert.rejects(
        () => cleanupFailure.adminDeleteStory('story-1'),
        /admin storage cleanup failed/,
    );
    assert.deepEqual(cleanupEvents, ['paths-read', 'story-delete', 'storage-remove']);
}

const storySource = read('src/services/storyService.js');
assert.doesNotMatch(
    storySource,
    /deleteStoryFiles/,
    'Member Story delete must not run the old pre-delete file cleanup path',
);

const adminSource = read('src/services/adminService.js');
const adminDeleteStart = adminSource.indexOf('export async function adminDeleteStory(');
const adminDeleteEnd = adminSource.indexOf('\nexport ', adminDeleteStart + 1);
const adminDeleteBody = adminSource.slice(
    adminDeleteStart,
    adminDeleteEnd >= 0 ? adminDeleteEnd : adminSource.length,
);
assert.doesNotMatch(
    adminDeleteBody,
    /\.from\('user_files'\)\s*\.delete\(/,
    'Admin Story delete must rely on confirmed ON DELETE CASCADE instead of manually deleting child metadata',
);

await verifyMemberStoryDelete();
await verifyAdminStoryDelete();

console.log('PASS: FIX 18 Story delete / attachment consistency');
