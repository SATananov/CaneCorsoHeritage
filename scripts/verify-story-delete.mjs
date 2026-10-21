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

const fileSource = read('src/services/fileService.js');
assert.doesNotMatch(
    fileSource,
    /export async function deleteStoryFiles\(/,
    'Obsolete pre-delete Story file cleanup helper must be removed',
);

const storySource = read('src/services/storyService.js');
assert.doesNotMatch(
    storySource,
    /deleteStoryFiles/,
    'Member Story delete must not run the old pre-delete file cleanup path',
);

const adminSource = read('src/services/adminService.js');
assert.doesNotMatch(
    adminSource,
    /adminDeleteStory/,
    'Admin Story hard-delete must remain absent from the moderation model',
);

await verifyMemberStoryDelete();

console.log('PASS: story delete and attachments');
