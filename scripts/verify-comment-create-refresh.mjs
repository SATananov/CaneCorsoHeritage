import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/CommentsSection.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function CommentsForTarget(');
const end = source.indexOf('    function authorLabel(');
assert.ok(start >= 0 && end > start, 'Locate actual component logic');
const keyExpression = source.match(/key=\{(JSON\.stringify\([^\n]+)\}/)?.[1];
assert.ok(keyExpression, 'The component scopes state with a React key');
const getKey = runInNewContext(`({ targetType, targetId, user }) => ${keyExpression}`);
// Execute production handlers/effects with persistent hooks, replacing only JSX
// and imported services. No copied submission logic and no network requests.
const componentSource = `${source.slice(source.indexOf('const MAX_COMMENT_LENGTH'), source.indexOf('function CommentsSection('))}
${source.slice(start, end)}
    return { comments, profilesById, commentText, editingId, editText, loading,
        saving, error, reactions, actionId, reactionActionId, setCommentText,
        setEditText, submitHandler, refreshComments, startEdit, saveEdit,
        removeComment, toggleReaction };
}
CommentsForTarget;`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness() {
    const calls = Object.fromEntries(['create', 'fetch', 'profiles', 'reactions', 'update', 'delete', 'setReaction', 'removeReaction'].map((name) => [name, []]));
    const outcomes = Object.fromEntries(Object.keys(calls).map((name) => [name, []]));
    const database = [];
    let sequence = 0;
    let props = { targetType: 'story', targetId: 'A', user: { id: 'author' }, isActive: true };
    let language = 'en';
    let current;
    let confirmed = true;
    const instances = [];
    const row = (id, content = id, targetId = props.targetId) => ({
        id, content, target_type: props.targetType, target_id: targetId,
        author_id: props.user?.id ?? 'author',
        created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-07T00:00:00Z',
    });
    function service(name, fallback) {
        return async (...args) => {
            calls[name].push(args);
            const value = outcomes[name].length ? outcomes[name].shift() : fallback(...args);
            if (value instanceof Error) throw value;
            return value;
        };
    }
    const services = {
        createComment: service('create', (type, id, content) => {
            const comment = { ...row(`saved-${++sequence}`, content, id), target_type: type };
            database.push(comment);
            return comment;
        }),
        fetchComments: service('fetch', (type, id) => database.filter((item) => item.target_type === type && item.target_id === id)),
        fetchCommentAuthorProfiles: service('profiles', (ids) => [...new Set(ids)].map((id) => ({ id, display_name: id }))),
        fetchCommentReactions: service('reactions', () => []),
        updateComment: service('update', (id, content) => {
            const index = database.findIndex((item) => item.id === id);
            database[index] = { ...database[index], content };
            return database[index];
        }),
        deleteComment: service('delete', (id) => { database.splice(database.findIndex((item) => item.id === id), 1); }),
        setCommentReaction: service('setReaction', (id, reaction) => ({ comment_id: id, user_id: props.user.id, reaction })),
        removeCommentReaction: service('removeReaction', () => undefined),
    };
    function mount(key) {
        const instance = { key, slots: [], cursor: 0, effects: [], dirty: false, mounted: true, lateUpdates: 0 };
        const Component = runInNewContext(componentSource, {
            ...services, AbortController, Intl,
            window: { confirm: () => confirmed },
            useLanguage: () => ({ language }),
            getTranslation: (_language, _namespace, name) => name,
            useState(initial) {
                const index = instance.cursor++;
                const slot = instance.slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
                return [slot.value, (next) => {
                    if (!instance.mounted) { instance.lateUpdates++; return; }
                    const value = typeof next === 'function' ? next(slot.value) : next;
                    if (!Object.is(value, slot.value)) { slot.value = value; instance.dirty = true; }
                }];
            },
            useRef(initial) {
                return instance.slots[instance.cursor++] ??= { current: initial };
            },
            useMemo(callback) { return callback(); },
            useEffect(callback, deps) {
                const index = instance.cursor++;
                const previous = instance.slots[index];
                if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                    instance.effects.push(() => {
                        previous?.cleanup?.();
                        instance.slots[index] = { deps, callback, cleanup: callback() };
                    });
                }
            },
        });
        instance.render = () => {
            let view;
            let renders = 0;
            do {
                assert.ok(++renders < 10, 'No render loop');
                instance.cursor = 0;
                instance.dirty = false;
                view = Component(props);
                instance.effects.splice(0).forEach((effect) => effect());
            } while (instance.dirty);
            return view;
        };
        instance.unmount = () => {
            instance.slots.forEach((slot) => slot.cleanup?.());
            instance.mounted = false;
        };
        instances.push(instance);
        return instance;
    }
    function render() {
        const key = getKey(props);
        if (!current || current.key !== key) {
            current?.unmount();
            current = mount(key);
        }
        return current.render();
    }
    async function settle() { await setImmediate(); return render(); }
    const draft = (text) => { render().setCommentText(text); };
    const submit = () => render().submitHandler({ preventDefault() {} });
    return {
        calls, outcomes, database, instances, row, render, settle, draft, submit,
        change: (next) => { props = { ...props, ...next }; return render(); },
        language: (next) => { language = next; return render(); },
        confirm: (next) => { confirmed = next; },
        unmount: () => current.unmount(),
        replayEffects: () => {
            const effects = current.slots.filter((slot) => slot.callback);
            effects.forEach((slot) => slot.cleanup?.());
            effects.forEach((slot) => { slot.cleanup = slot.callback(); });
        },
    };
}

let checks = 0;
async function check(label, test) {
    await test();
    checks++;
    console.log(`PASS: ${label}`);
}
async function ready() {
    const h = harness();
    h.render();
    await h.settle();
    return h;
}
function expectSaved(h, count = 1) {
    const view = h.render();
    assert.equal(h.calls.create.length, count);
    assert.equal(view.commentText, '');
    assert.equal(view.saving, false);
    assert.equal(view.loading, false);
    assert.equal(view.comments.length, count);
}

await check('normal create clears draft and renders the saved comment', async () => {
    const h = await ready();
    h.draft('  First comment  ');
    await h.submit();
    expectSaved(h);
    assert.equal(h.render().comments[0].content, 'First comment');
    assert.equal(h.render().error, '');
    assert.equal(h.render().profilesById.author.display_name, 'author');
});

for (const stage of ['fetch', 'profiles', 'reactions']) {
    await check(`successful create survives ${stage} refresh failure and repeated submit attempts`, async () => {
        const h = await ready();
        h.draft('Persisted');
        h.outcomes[stage].push(new Error('Read failed'));
        await h.submit();
        expectSaved(h);
        assert.equal(h.render().error, 'loadError');
        assert.equal(h.render().comments[0].id, h.database[0].id);
        // A submit retry cannot reuse the consumed draft. Repeated language
        // reload failures exercise the existing UI's list reload path.
        for (const language of ['bg', 'it']) {
            await h.submit();
            h.outcomes.fetch.push(new Error('Read still failed'));
            h.language(language);
            await h.settle();
            expectSaved(h);
            assert.equal(h.render().error, 'loadError');
        }
        h.language('en');
        await h.settle();
        expectSaved(h);
        assert.equal(h.render().error, '');
    });
}

await check('create failure retains draft, reports save error, and permits a real retry', async () => {
    const h = await ready();
    h.draft('Retry me');
    h.outcomes.create.push(new Error('Write failed'));
    await h.submit();
    assert.equal(h.render().commentText, 'Retry me');
    assert.equal(h.render().comments.length, 0);
    assert.equal(h.render().error, 'saveError');
    assert.equal(h.render().saving, false);
    assert.equal(h.calls.fetch.length, 1, 'No refresh after failed create');
    await h.submit();
    assert.equal(h.calls.create.length, 2);
    assert.equal(h.render().comments.length, 1);
    assert.equal(h.render().commentText, '');
});

await check('a distinct new draft works after a saved comment and failed refresh', async () => {
    const h = await ready();
    h.draft('First');
    h.outcomes.fetch.push(new Error('Read failed'));
    await h.submit();
    h.draft('Second');
    await h.submit();
    expectSaved(h, 2);
    assert.deepEqual(Array.from(h.render().comments, (item) => item.content), ['First', 'Second']);
});

await check('same-tick and in-flight submits cannot duplicate creation', async () => {
    const h = await ready();
    const create = deferred();
    const refresh = deferred();
    h.outcomes.create.push(create.promise);
    h.outcomes.fetch.push(refresh.promise);
    h.draft('Only once');
    const handler = h.render().submitHandler;
    const pending = handler({ preventDefault() {} });
    await handler({ preventDefault() {} });
    assert.equal(h.calls.create.length, 1);
    create.resolve(h.row('saved'));
    await h.settle();
    assert.equal(h.render().commentText, '');
    assert.equal(h.render().saving, true);
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    refresh.resolve([h.row('saved')]);
    await pending;
    expectSaved(h);
});

await check('validation and inactive/guest guards still prevent writes', async () => {
    const h = await ready();
    await h.submit();
    assert.equal(h.render().error, 'emptyError');
    h.draft('x'.repeat(2001));
    await h.submit();
    assert.equal(h.render().error, 'lengthError');
    h.change({ isActive: false }); h.draft('Blocked'); await h.submit();
    h.change({ user: null, isActive: true }); h.draft('Guest'); await h.submit();
    assert.equal(h.calls.create.length, 0);
});

await check('older initial read cannot erase a saved comment after refresh failure', async () => {
    const h = harness();
    const initial = deferred();
    h.outcomes.fetch.push(initial.promise);
    h.render(); h.draft('Saved before initial read');
    h.outcomes.fetch.push(new Error('Refresh failed'));
    await h.submit();
    expectSaved(h);
    initial.resolve([]);
    await h.settle();
    expectSaved(h);
    assert.equal(h.render().error, 'loadError');
});

for (const fails of [false, true]) {
    await check(`older refresh ${fails ? 'error' : 'success'} cannot replace a newer list`, async () => {
        const h = await ready();
        const old = deferred();
        h.outcomes.fetch.push(old.promise);
        const pending = h.render().refreshComments();
        h.outcomes.fetch.push([h.row('newest')]);
        await h.render().refreshComments();
        if (fails) old.reject(new Error('Late error')); else old.resolve([h.row('obsolete')]);
        assert.equal(await pending, false);
        assert.equal(h.render().comments[0].id, 'newest');
        assert.equal(h.render().error, '');
    });
}

for (const context of [{ targetId: 'B' }, { targetType: 'heritage' }, { user: { id: 'other' } }]) {
    await check(`changed context ${JSON.stringify(context)} isolates late refresh and drafts`, async () => {
        const h = await ready();
        const old = deferred();
        h.draft('Old draft');
        h.outcomes.fetch.push(old.promise);
        const pending = h.render().refreshComments();
        h.change(context);
        await h.settle();
        h.draft('New draft');
        old.resolve([h.row('obsolete')]);
        assert.equal(await pending, false);
        assert.equal(h.render().comments.length, 0);
        assert.equal(h.render().commentText, 'New draft');
        assert.equal(h.instances[0].lateUpdates, 0);
        assert.equal(h.instances.length, 2);
    });
}

for (const phase of ['create', 'fetch']) {
    for (const fails of [false, true]) {
        await check(`unmount blocks late ${phase} ${fails ? 'error' : 'success'}`, async () => {
            const h = await ready();
            const late = deferred();
            h.outcomes[phase].push(late.promise);
            h.draft('Leaving');
            const pending = h.submit();
            await h.settle();
            h.unmount();
            if (fails) late.reject(new Error('Late failure'));
            else late.resolve(phase === 'create' ? h.row('saved') : [h.row('saved')]);
            await pending;
            assert.equal(h.instances[0].lateUpdates, 0);
        });
    }
}

await check('same-context rerenders preserve drafts and do not refetch', async () => {
    const h = await ready();
    h.draft('Keep me');
    h.change({ user: { id: 'author' } });
    h.render(); h.render();
    assert.equal(h.calls.fetch.length, 1);
    assert.equal(h.render().commentText, 'Keep me');
    assert.equal(h.instances.length, 1);
});

await check('Strict Mode effect replay rejects the superseded initial load', async () => {
    const h = harness();
    const old = deferred();
    h.outcomes.fetch.push(old.promise);
    h.render();
    h.outcomes.fetch.push([h.row('current')]);
    h.replayEffects();
    await h.settle();
    old.resolve([h.row('obsolete')]);
    await h.settle();
    assert.equal(h.render().comments[0].id, 'current');
    assert.equal(h.render().loading, false);
});

await check('edit, delete confirmation, and reaction toggle/switch retain their behavior', async () => {
    const h = await ready();
    h.draft('Original'); await h.submit();
    const id = h.render().comments[0].id;
    h.render().startEdit(h.render().comments[0]);
    h.render().setEditText('Edited');
    await h.render().saveEdit(id);
    assert.equal(h.render().comments[0].content, 'Edited');
    assert.equal(h.render().editingId, '');
    assert.equal(h.render().actionId, '');
    await h.render().toggleReaction(id, 'like');
    assert.equal(h.render().reactions[0].reaction, 'like');
    await h.render().toggleReaction(id, 'dislike');
    assert.equal(h.render().reactions.length, 1);
    assert.equal(h.render().reactions[0].reaction, 'dislike');
    await h.render().toggleReaction(id, 'dislike');
    assert.equal(h.render().reactions.length, 0);
    assert.equal(h.calls.setReaction.length, 2);
    assert.equal(h.calls.removeReaction.length, 1);
    h.confirm(false); await h.render().removeComment(id);
    assert.equal(h.calls.delete.length, 0);
    h.confirm(true); await h.render().removeComment(id);
    assert.equal(h.render().comments.length, 0);
    assert.equal(h.calls.delete.length, 1);
    assert.equal(h.calls.create.length, 1);
});

console.log(`${checks} mocked checks; no network requests.`);
console.log('COMMENT CREATE REFRESH 01: PASS');
