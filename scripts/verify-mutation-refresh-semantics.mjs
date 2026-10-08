import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function between(source, startText, endText, label) {
    const start = source.indexOf(startText);
    const end = source.indexOf(endText, start);
    assert.ok(start >= 0 && end > start, `Locate ${label}`);
    return source.slice(start, end);
}

function errorQueue() {
    const values = [];
    return {
        fail(message) { values.push(new Error(message)); },
        async take(fallback) {
            if (!values.length) return fallback();
            throw values.shift();
        },
    };
}

const myFilesSource = read('src/pages/MyFilesPage.jsx');
const myFilesHandlers = between(
    myFilesSource,
    '    async function visibilityHandler(file) {',
    '\n    return (',
    'My Files mutation handlers',
);

const createMyFilesHandlers = runInNewContext(`
(ctx) => {
    const {
        setError, setFiles, t, updateUserFileVisibility,
        deleteUserFile, refreshFiles,
    } = ctx;
${myFilesHandlers}
    return { visibilityHandler, deleteHandler };
}
`);

function myFilesHarness() {
    let files = [{
        id: 'file-1',
        visibility: 'private',
        moderation_status: 'approved',
        moderated_at: 'old',
        moderated_by: 'admin',
        storage_path: 'owner/file-1.jpg',
    }];
    let error = '';
    let visibilityCalls = 0;
    let deleteCalls = 0;
    let refreshCalls = 0;
    const visibilityOutcome = errorQueue();
    const deleteOutcome = errorQueue();
    const refreshOutcome = errorQueue();

    const ctx = {
        t: (key) => key,
        setError: (value) => { error = value; },
        setFiles: (next) => {
            files = typeof next === 'function' ? next(files) : next;
        },
        updateUserFileVisibility: async () => {
            visibilityCalls += 1;
            return visibilityOutcome.take(() => undefined);
        },
        deleteUserFile: async () => {
            deleteCalls += 1;
            return deleteOutcome.take(() => undefined);
        },
        refreshFiles: async () => {
            refreshCalls += 1;
            return refreshOutcome.take(() => undefined);
        },
    };

    const handlers = createMyFilesHandlers(ctx);
    return {
        ...handlers,
        file: () => files[0],
        files: () => files,
        error: () => error,
        visibilityOutcome,
        deleteOutcome,
        refreshOutcome,
        calls: () => ({ visibilityCalls, deleteCalls, refreshCalls }),
    };
}

const commentsSource = read('src/components/CommentsSection.jsx');
const commentHandlers = between(
    commentsSource,
    '    async function saveEdit(commentId) {',
    '    async function toggleReaction(',
    'comment edit/delete handlers',
);

const createCommentHandlers = runInNewContext(`
(ctx) => {
    const MAX_COMMENT_LENGTH = 2000;
    let editText = ctx.editText;
    let editingId = ctx.editingId;
    const {
        setError, setActionId, setComments, setReactions,
        t, updateComment, deleteComment, refreshComments, window,
    } = ctx;
    function cancelEdit() {
        editingId = '';
        editText = '';
        ctx.cancelled += 1;
        ctx.editingId = editingId;
        ctx.editText = editText;
    }
${commentHandlers}
    return { saveEdit, removeComment };
}
`);

function commentHarness() {
    let comments = [{
        id: 'comment-1',
        content: 'Before',
        author_id: 'owner',
        created_at: '2026-10-08T00:00:00Z',
        updated_at: '2026-10-08T00:00:00Z',
    }];
    let reactions = [{ comment_id: 'comment-1', user_id: 'owner', reaction: 'like' }];
    let error = '';
    let actionId = '';
    let updateCalls = 0;
    let deleteCalls = 0;
    let refreshCalls = 0;
    const updateOutcome = errorQueue();
    const deleteOutcome = errorQueue();
    const refreshOutcome = errorQueue();
    const ctx = {
        editText: 'After',
        editingId: 'comment-1',
        cancelled: 0,
        t: (key) => key,
        window: { confirm: () => true },
        setError: (value) => { error = value; },
        setActionId: (value) => { actionId = value; },
        setComments: (next) => {
            comments = typeof next === 'function' ? next(comments) : next;
        },
        setReactions: (next) => {
            reactions = typeof next === 'function' ? next(reactions) : next;
        },
        updateComment: async (id, content) => {
            updateCalls += 1;
            return updateOutcome.take(() => ({
                ...comments.find((comment) => comment.id === id),
                content,
                updated_at: '2026-10-08T01:00:00Z',
            }));
        },
        deleteComment: async () => {
            deleteCalls += 1;
            return deleteOutcome.take(() => undefined);
        },
        refreshComments: async () => {
            refreshCalls += 1;
            return refreshOutcome.take(() => true);
        },
    };
    const handlers = createCommentHandlers(ctx);
    return {
        ...handlers,
        comments: () => comments,
        reactions: () => reactions,
        error: () => error,
        actionId: () => actionId,
        context: ctx,
        updateOutcome,
        deleteOutcome,
        refreshOutcome,
        calls: () => ({ updateCalls, deleteCalls, refreshCalls }),
    };
}

let checks = 0;
async function check(label, test) {
    await test();
    checks += 1;
    console.log(`PASS: ${label}`);
}

await check('My Files visibility mutation failure remains an action error and skips refresh', async () => {
    const h = myFilesHarness();
    const original = { ...h.file() };
    h.visibilityOutcome.fail('write failed');
    await h.visibilityHandler(original);
    assert.equal(h.error(), 'visibilityError');
    assert.deepEqual(h.file(), original);
    assert.deepEqual(h.calls(), { visibilityCalls: 1, deleteCalls: 0, refreshCalls: 0 });
});

await check('My Files committed visibility survives refresh failure and reports load error', async () => {
    const h = myFilesHarness();
    const target = { ...h.file() };
    h.refreshOutcome.fail('read failed');
    await h.visibilityHandler(target);
    assert.equal(h.error(), 'loadError');
    assert.equal(h.file().visibility, 'community');
    assert.equal(h.file().moderation_status, 'pending');
    assert.equal(h.file().moderated_at, null);
    assert.equal(h.file().moderated_by, null);
    assert.deepEqual(h.calls(), { visibilityCalls: 1, deleteCalls: 0, refreshCalls: 1 });
});

await check('My Files delete mutation failure keeps the file and skips refresh', async () => {
    const h = myFilesHarness();
    h.deleteOutcome.fail('delete failed');
    await h.deleteHandler({ ...h.file() });
    assert.equal(h.error(), 'deleteError');
    assert.equal(h.files().length, 1);
    assert.deepEqual(h.calls(), { visibilityCalls: 0, deleteCalls: 1, refreshCalls: 0 });
});

await check('My Files committed delete survives refresh failure and reports load error', async () => {
    const h = myFilesHarness();
    const target = { ...h.file() };
    h.refreshOutcome.fail('read failed');
    await h.deleteHandler(target);
    assert.equal(h.error(), 'loadError');
    assert.equal(h.files().length, 0);
    assert.deepEqual(h.calls(), { visibilityCalls: 0, deleteCalls: 1, refreshCalls: 1 });
});

await check('comment update failure preserves edit state and reports update error', async () => {
    const h = commentHarness();
    h.updateOutcome.fail('write failed');
    await h.saveEdit('comment-1');
    assert.equal(h.error(), 'updateError');
    assert.equal(h.comments()[0].content, 'Before');
    assert.equal(h.context.editingId, 'comment-1');
    assert.equal(h.context.cancelled, 0);
    assert.deepEqual(h.calls(), { updateCalls: 1, deleteCalls: 0, refreshCalls: 0 });
});

await check('committed comment update survives refresh failure and exits edit mode', async () => {
    const h = commentHarness();
    h.refreshOutcome.fail('read failed');
    await h.saveEdit('comment-1');
    assert.equal(h.error(), 'loadError');
    assert.equal(h.comments()[0].content, 'After');
    assert.equal(h.context.editingId, '');
    assert.equal(h.context.cancelled, 1);
    assert.equal(h.actionId(), '');
    assert.deepEqual(h.calls(), { updateCalls: 1, deleteCalls: 0, refreshCalls: 1 });
});

await check('comment delete failure keeps the comment and reports delete error', async () => {
    const h = commentHarness();
    h.deleteOutcome.fail('write failed');
    await h.removeComment('comment-1');
    assert.equal(h.error(), 'deleteError');
    assert.equal(h.comments().length, 1);
    assert.equal(h.reactions().length, 1);
    assert.deepEqual(h.calls(), { updateCalls: 0, deleteCalls: 1, refreshCalls: 0 });
});

await check('committed comment delete survives refresh failure without resurrecting local state', async () => {
    const h = commentHarness();
    h.refreshOutcome.fail('read failed');
    await h.removeComment('comment-1');
    assert.equal(h.error(), 'loadError');
    assert.equal(h.comments().length, 0);
    assert.equal(h.reactions().length, 0);
    assert.equal(h.context.editingId, '');
    assert.equal(h.context.cancelled, 1);
    assert.equal(h.actionId(), '');
    assert.deepEqual(h.calls(), { updateCalls: 0, deleteCalls: 1, refreshCalls: 1 });
});

assert.match(myFilesHandlers, /setError\(t\('loadError'\)\)/, 'My Files refresh failures use loadError');
assert.match(commentHandlers, /setError\(t\('loadError'\)\)/, 'Comment refresh failures use loadError');

console.log(`MUTATION REFRESH SEMANTICS 01: PASS (${checks} runtime checks)`);
