import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/AddStoryModal.jsx', import.meta.url), 'utf8');
const start = source.indexOf('const STORY_DATA_KEYS');
const end = source.search(/    return \(\r?\n        <div/);
assert.ok(start >= 0 && end > start, 'Locate modal logic before JSX');
// Run the actual component handlers with persistent hooks and mocked services.
// Replace only presentation; no service imports or network requests are used.
const componentSource = `${source.slice(start, end)}
    return { formData, selectedFiles, error, isSubmitting,
        changeHandler, fileChangeHandler, submitHandler };
}
AddStoryModal;`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness({ editing = false } = {}) {
    const slots = [];
    let cursor = 0;
    const calls = { create: [], update: [], sync: [], upload: [], saved: [], close: [] };
    const outcomes = Object.fromEntries(Object.keys(calls).map((key) => [key, []]));
    function service(key, fallback) {
        return async (...args) => {
            calls[key].push(structuredClone(args));
            const result = outcomes[key].length ? outcomes[key].shift() : fallback(...args);
            if (result instanceof Error) throw result;
            return result;
        };
    }
    const props = {
        authorName: 'Author',
        story: editing ? {
            _id: 'existing', title: 'Title', description: 'Description', content: 'Content',
            visibility: 'community', original_language: 'en',
        } : null,
        onSaved: service('saved', () => undefined),
        onClose: () => { calls.close.push([]); },
    };
    const Modal = runInNewContext(componentSource, {
        document: { body: { style: { overflow: '' } } },
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        getStoryPartialSaveError: () => 'partialSaveError',
        getStoryCompletionRefreshError: () => 'completionRefreshError',
        useState(initial) {
            const index = cursor++;
            if (!slots[index]) {
                slots[index] = { value: typeof initial === 'function' ? initial() : initial };
            }
            return [slots[index].value, (next) => {
                slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
            }];
        },
        useRef(initial) {
            const index = cursor++;
            slots[index] ??= { current: initial };
            return slots[index];
        },
        useEffect(callback, dependencies) {
            const index = cursor++;
            const previous = slots[index];
            if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
                previous?.cleanup?.();
                slots[index] = { dependencies, cleanup: callback() };
            }
        },
        createStory: service('create', (data) => ({ ...data, _id: 'created' })),
        updateStory: service('update', (id, data) => ({ ...data, _id: id })),
        syncStoryFilesVisibility: service('sync', () => undefined),
        uploadUserFiles: service('upload', () => []),
    });
    const render = () => { cursor = 0; return Modal(props); };
    const change = (name, value) => render().changeHandler({ target: { name, value } });
    const files = (names = ['photo.jpg']) => render().fileChangeHandler({
        target: { files: names.map((name) => ({ name, size: 100 })) },
    });
    const submit = () => render().submitHandler({ preventDefault() {} });
    function valid() {
        change('title', ' Title ');
        change('description', ' Description ');
        change('content', ' Content ');
    }
    function completed() {
        assert.equal(render().error, '');
        assert.equal(render().isSubmitting, false);
        assert.equal(calls.saved.length, 1);
        assert.equal(calls.close.length, 1);
    }
    function failed(expectedError = 'saveError') {
        assert.equal(render().error, expectedError);
        assert.equal(render().isSubmitting, false);
        assert.equal(calls.saved.length, 0);
        assert.equal(calls.close.length, 0);
    }
    return { calls, outcomes, render, change, files, submit, valid, completed, failed };
}

async function check(label, test) {
    await test();
    console.log(`PASS: ${label}`);
}

await check('create without attachments creates once and completes normally', async () => {
    const h = harness();
    h.valid();
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.create[0][0].title, 'Title');
    assert.equal(h.calls.create[0][0].original_language, 'en');
    assert.equal(h.calls.update.length, 0);
    assert.equal(h.calls.upload.length, 0);
    h.completed();
});

await check('successful attachments use the created story ID', async () => {
    const h = harness();
    h.valid(); h.files();
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.upload.length, 1);
    assert.deepEqual(h.calls.upload[0][1], { storyId: 'created', visibility: 'community' });
    h.completed();
});

await check('repeated attachment failures retain one story, then retry completes', async () => {
    const h = harness();
    h.valid(); h.files();
    for (let attempt = 0; attempt < 3; attempt++) {
        h.outcomes.upload.push(new Error('Upload failed'));
        await h.submit();
        h.failed('partialSaveError');
        assert.equal(h.calls.create.length, 1);
        assert.equal(h.calls.upload.length, attempt + 1);
        assert.equal(h.calls.upload[attempt][1].storyId, 'created');
    }
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.upload.length, 4);
    assert.ok(h.calls.update.every(([id]) => id === 'created'));
    h.completed();
});

await check('failed creation leaves no saved identity and retry can create', async () => {
    const h = harness();
    h.valid(); h.files();
    h.outcomes.create.push(new Error('Create failed'));
    await h.submit();
    h.failed();
    assert.equal(h.calls.upload.length, 0);
    await h.submit();
    assert.equal(h.calls.create.length, 2);
    assert.equal(h.calls.update.length, 0);
    assert.equal(h.calls.upload.length, 1);
    h.completed();
});

await check('retry saves changed fields and synchronizes visibility on the same story', async () => {
    const h = harness();
    h.valid(); h.files();
    h.outcomes.upload.push(new Error('Upload failed'));
    await h.submit();
    h.change('title', 'Revised');
    h.change('visibility', 'private');
    h.files(['replacement.pdf']);
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.update[0][0], 'created');
    assert.equal(h.calls.update[0][1].title, 'Revised');
    assert.deepEqual(h.calls.sync[0], ['created', 'private']);
    assert.equal(h.calls.upload[1][0][0].name, 'replacement.pdf');
    assert.equal(h.calls.upload[1][1].visibility, 'private');
    h.completed();
});

for (const failingStage of ['update', 'sync']) {
    await check(`failed retry ${failingStage} retains saved identity for another retry`, async () => {
        const h = harness();
        h.valid(); h.files();
        h.outcomes.upload.push(new Error('Upload failed'));
        await h.submit();
        if (failingStage === 'update') h.change('title', 'Revised');
        else h.change('visibility', 'private');
        h.outcomes[failingStage].push(new Error('Retry failed'));
        await h.submit();
        h.failed(failingStage === 'sync' ? 'partialSaveError' : 'saveError');
        assert.equal(h.calls.upload.length, 1);
        await h.submit();
        assert.equal(h.calls.create.length, 1);
        assert.equal(h.calls.upload.length, 2);
        h.completed();
    });
}

await check('attachments can be removed after failure without creating another story', async () => {
    const h = harness();
    h.valid(); h.files();
    h.outcomes.upload.push(new Error('Upload failed'));
    await h.submit();
    h.files([]);
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.upload.length, 1);
    h.completed();
});

await check('edit flow retries attachments on the existing story without redundant story writes', async () => {
    const h = harness({ editing: true });
    h.files();
    h.outcomes.upload.push(new Error('Upload failed'));
    await h.submit();
    h.failed('partialSaveError');
    await h.submit();
    assert.equal(h.calls.create.length, 0);
    assert.equal(h.calls.update.length, 0);
    assert.equal(h.calls.sync.length, 0);
    assert.ok(h.calls.upload.every(([, options]) => options.storyId === 'existing'));
    h.completed();
});

await check('validation blocks writes and does not leave the submission guard locked', async () => {
    const h = harness();
    await h.submit();
    assert.equal(h.render().error, 'requiredError');
    assert.equal(h.render().isSubmitting, false);
    assert.equal(h.calls.create.length, 0);
    h.valid();
    await h.submit();
    assert.equal(h.calls.create.length, 1);
    h.completed();
});

await check('concurrent submits are blocked before render and throughout async completion', async () => {
    const h = harness();
    h.valid(); h.files();
    const creation = deferred();
    const upload = deferred();
    const saved = deferred();
    h.outcomes.create.push(creation.promise);
    h.outcomes.upload.push(upload.promise);
    h.outcomes.saved.push(saved.promise);
    const handler = h.render().submitHandler;
    const event = { preventDefault() {} };
    const first = handler(event);
    await handler(event);
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.render().isSubmitting, true);
    creation.resolve({ _id: 'created' });
    await setImmediate();
    await h.submit();
    assert.equal(h.calls.upload.length, 1);
    assert.equal(h.calls.update.length, 0);
    assert.equal(h.render().isSubmitting, true);
    upload.resolve([]);
    await setImmediate();
    await h.submit();
    assert.equal(h.calls.saved.length, 1);
    assert.equal(h.calls.close.length, 0);
    assert.equal(h.render().isSubmitting, true);
    saved.resolve();
    await first;
    h.completed();
});

await check('a fresh modal instance starts a separate story', async () => {
    for (let i = 0; i < 2; i++) {
        const h = harness();
        h.valid();
        await h.submit();
        assert.equal(h.calls.create.length, 1);
        assert.equal(h.calls.update.length, 0);
        h.completed();
    }
});

console.log('STORY CREATE RETRY 01: PASS');
