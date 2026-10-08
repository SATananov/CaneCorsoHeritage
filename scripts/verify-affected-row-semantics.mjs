import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function functionBody(source, name) {
    const start = source.indexOf(`export async function ${name}(`);
    assert.ok(start >= 0, `${name} must exist`);
    const next = source.indexOf('\nexport ', start + 1);
    return source.slice(start, next >= 0 ? next : source.length);
}

function assertSingleRowCount(path, name, expectedMessage) {
    const body = functionBody(read(path), name);
    assert.match(body, /count:\s*'exact'/, `${name} must request an exact affected-row count`);
    assert.match(body, /count\s*!==\s*1|\w+Count\s*!==\s*1/, `${name} must reject non-single-row outcomes`);
    assert.ok(body.includes(expectedMessage), `${name} must expose the expected service error semantics`);
}

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

function createRatingSupabase(result) {
    return {
        from(table) {
            assert.equal(table, 'story_ratings');
            return {
                update(_payload, options) {
                    assert.deepEqual(options, { count: 'exact' });
                    return {
                        eq(column, value) {
                            assert.equal(column, 'story_id');
                            assert.equal(value, 'story-1');
                            return {
                                eq(userColumn, userValue) {
                                    assert.equal(userColumn, 'user_id');
                                    assert.equal(userValue, 'user-1');
                                    return Promise.resolve(result);
                                },
                            };
                        },
                    };
                },
            };
        },
    };
}

function createReactionSupabase(result) {
    return {
        auth: {
            async getUser() {
                return {
                    data: { user: { id: 'user-1' } },
                    error: null,
                };
            },
        },
        from(table) {
            assert.equal(table, 'comment_reactions');
            return {
                delete(options) {
                    assert.deepEqual(options, { count: 'exact' });
                    return {
                        eq(column, value) {
                            assert.equal(column, 'comment_id');
                            assert.equal(value, 'comment-1');
                            return {
                                eq(userColumn, userValue) {
                                    assert.equal(userColumn, 'user_id');
                                    assert.equal(userValue, 'user-1');
                                    return Promise.resolve(result);
                                },
                            };
                        },
                    };
                },
            };
        },
    };
}

async function verifyRuntimeSemantics() {
    const ratingPath = 'src/services/ratingService.js';
    const ratingZero = loadService(ratingPath, ['saveStoryRating'], {
        supabase: createRatingSupabase({ count: 0, error: null }),
    });

    await assert.rejects(
        () => ratingZero.saveStoryRating('story-1', 'user-1', 5, true),
        /Your rating no longer exists\. Refresh and try again\./,
        'Rating update must reject a zero-row success response',
    );

    const ratingOne = loadService(ratingPath, ['saveStoryRating'], {
        supabase: createRatingSupabase({ count: 1, error: null }),
    });
    await ratingOne.saveStoryRating('story-1', 'user-1', 5, true);

    const reactionPath = 'src/services/commentReactionService.js';
    const reactionZero = loadService(reactionPath, ['removeCommentReaction'], {
        supabase: createReactionSupabase({ count: 0, error: null }),
    });

    await assert.rejects(
        () => reactionZero.removeCommentReaction('comment-1'),
        /Comment reaction was not removed because it no longer exists\./,
        'Reaction delete must reject a zero-row success response',
    );

    const reactionOne = loadService(reactionPath, ['removeCommentReaction'], {
        supabase: createReactionSupabase({ count: 1, error: null }),
    });
    await reactionOne.removeCommentReaction('comment-1');

    const fileService = loadService('src/services/fileService.js', ['syncStoryFilesVisibility'], {
        supabase: {
            from(table) {
                assert.equal(table, 'user_files');
                return {
                    update() {
                        return {
                            eq(column, value) {
                                assert.equal(column, 'story_id');
                                assert.equal(value, 'story-1');
                                return Promise.resolve({ count: 0, error: null });
                            },
                        };
                    },
                };
            },
        },
    });
    await fileService.syncStoryFilesVisibility('story-1', 'private');

    const storyEvents = [];
    const sessionSupabase = {
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
                            return Promise.resolve({
                                data: [{ storage_path: 'story/path.webp' }],
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
                        storyEvents.push('storage-remove');
                        assert.deepEqual(paths, ['story/path.webp']);
                        return { error: null };
                    },
                };
            },
        },
    };

    const zeroFetch = async (_url, options) => {
        storyEvents.push('story-delete');
        assert.equal(options.method, 'DELETE');
        assert.equal(options.headers.Prefer, 'return=representation');
        return {
            ok: true,
            async json() {
                return [];
            },
        };
    };

    const storyZero = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: sessionSupabase,
        fetch: zeroFetch,
    });

    await assert.rejects(
        () => storyZero.deleteStory('story-1'),
        /Story not found or not owned by this account\./,
        'Story delete must reject HTTP success with zero returned rows',
    );
    assert.deepEqual(storyEvents, ['story-delete'], 'Zero-row Story delete must not clean Storage');

    storyEvents.length = 0;
    const oneFetch = async (url, options) => {
        storyEvents.push('story-delete');
        assert.match(url, /&select=id$/);
        assert.equal(options.method, 'DELETE');
        assert.equal(options.headers.Prefer, 'return=representation');
        return {
            ok: true,
            async json() {
                return [{ id: 'story-1' }];
            },
        };
    };

    const storyOne = loadService('src/services/storyService.js', ['deleteStory'], {
        supabase: sessionSupabase,
        fetch: oneFetch,
    });
    await storyOne.deleteStory('story-1');
    assert.deepEqual(storyEvents, ['story-delete', 'storage-remove']);
}
const adminPath = 'src/services/adminService.js';
assertSingleRowCount(adminPath, 'moderateStory', 'Story moderation did not affect exactly one row.');
assertSingleRowCount(adminPath, 'moderateFile', 'File moderation did not affect exactly one row.');
assertSingleRowCount(adminPath, 'setMemberAccountStatus', 'Member account update did not affect exactly one row.');
assertSingleRowCount(adminPath, 'adminDeleteFile', 'File deletion did not affect exactly one row.');
assertSingleRowCount(adminPath, 'adminDeleteStory', 'Story deletion did not affect exactly one row.');

assertSingleRowCount('src/services/ratingService.js', 'saveStoryRating', 'Your rating no longer exists. Refresh and try again.');
assertSingleRowCount('src/services/fileRatingService.js', 'saveFileRating', 'Your rating no longer exists. Refresh and try again.');
assertSingleRowCount('src/services/heritageRatingService.js', 'saveHeritageRating', 'Your Heritage rating no longer exists. Refresh and try again.');
assertSingleRowCount('src/services/fileService.js', 'updateUserFileVisibility', 'File visibility update did not affect exactly one row.');
assertSingleRowCount('src/services/fileService.js', 'deleteUserFile', 'File deletion did not affect exactly one row.');
assertSingleRowCount('src/services/commentReactionService.js', 'removeCommentReaction', 'Comment reaction was not removed because it no longer exists.');
assertSingleRowCount('src/services/commentService.js', 'deleteComment', 'Comment deletion did not affect exactly one row.');
assertSingleRowCount('src/services/profileService.js', 'uploadProfileAvatar', 'Unable to save avatar because the profile was not updated.');
assertSingleRowCount('src/services/profileService.js', 'removeProfileAvatar', 'Avatar removal did not update the profile row.');

const fileServiceSource = read('src/services/fileService.js');
const syncBody = functionBody(fileServiceSource, 'syncStoryFilesVisibility');
assert.doesNotMatch(syncBody, /count:\s*'exact'/, 'Story attachment visibility sync may validly affect zero rows');

const storyDelete = functionBody(read('src/services/storyService.js'), 'deleteStory');
assert.ok(storyDelete.includes('&select=id'), 'Story delete must request the deleted row id');
assert.ok(storyDelete.includes("Prefer: 'return=representation'"), 'Story delete must request a representation');
assert.match(storyDelete, /const data = await response\.json\(\);/, 'Story delete must inspect the returned representation');
assert.ok(storyDelete.includes('Story not found or not owned by this account.'), 'Story delete must reject a 2xx response with zero deleted rows');

await verifyRuntimeSemantics();

console.log('PASS: FIX 14 affected-row checks / service error semantics');
