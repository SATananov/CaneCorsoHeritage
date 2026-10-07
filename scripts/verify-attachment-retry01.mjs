import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/AddStoryModal.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function getInitialForm(');
const end = source.search(/\n    return \(\r?\n        <div/);
assert.ok(start >= 0 && end > start);
const modalSource = `${source.slice(start, end)}
    return { error, isSubmitting, pendingFiles, currentUploads,
        changeHandler, fileChangeHandler, submitHandler };
}
AddStoryModal;`;
assert.match(source, /currentUploads\.map\(\(\{ file \}/, 'Completed uploads stay visible separately');
assert.match(source, /getTranslation\(language, 'storyDetails', 'attachedFiles'\)/);

// Exercise the real modal AND real single-file service behavior with a mocked SDK.
// No network, storage, or database clients are imported.
const service = readFileSync(new URL('../src/services/fileService.js', import.meta.url), 'utf8');
const serviceStart = service.indexOf('const MAX_FILE_SIZE');
const serviceEnd = service.indexOf('export async function fetchMyFiles');
assert.ok(serviceStart >= 0 && serviceEnd > serviceStart);
const uploadSource = `${service.slice(serviceStart, serviceEnd).replace('export async function', 'async function')}
uploadUserFiles;`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
const file = (name) => ({ name, size: 100, type: 'image/jpeg', lastModified: 123 });

function harness({ editing = false } = {}) {
    const hooks = [];
    let cursor = 0;
    const attempts = [];
    const metadataAttempts = [];
    const objects = new Map();
    const records = editing ? [{ id: 'existing-attachment', story_id: 'existing' }] : [];
    const removals = [];
    const calls = { create: [], update: [], sync: [], saved: [], close: [] };
    const outcomes = { storage: new Map(), metadata: new Map(), create: [], update: [], sync: [], saved: [] };
    async function result(queue) {
        const value = await queue?.shift();
        if (value instanceof Error) throw value;
        return value;
    }
    const supabase = {
        auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                return {
                    async upload(path, attachment) {
                        attempts.push({ file: attachment, path });
                        try { await result(outcomes.storage.get(attachment)); }
                        catch (error) { return { error }; }
                        objects.set(path, attachment);
                        return { error: null };
                    },
                    async remove(paths) {
                        removals.push(...paths);
                        paths.forEach((path) => objects.delete(path));
                        return { error: null };
                    },
                };
            },
        },
        from(table) {
            assert.equal(table, 'user_files');
            return {
                insert(row) {
                    return { select: () => ({ single: async () => {
                        const attachment = objects.get(row.storage_path);
                        metadataAttempts.push(attachment);
                        try { await result(outcomes.metadata.get(attachment)); }
                        catch (error) { return { data: null, error }; }
                        const data = { ...row, id: `attachment-${records.length}` };
                        records.push(data);
                        return { data, error: null };
                    } }) };
                },
            };
        },
    };
    const uploadUserFiles = runInNewContext(uploadSource, { supabase });
    const Modal = runInNewContext(modalSource, {
        document: { body: { style: { overflow: '' } } },
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        useState(initial) {
            const index = cursor++;
            hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [hooks[index].value, (next) => {
                hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
            }];
        },
        useRef(initial) {
            const index = cursor++;
            hooks[index] ??= { current: initial };
            return hooks[index];
        },
        useEffect(callback, deps) {
            const index = cursor++;
            if (!hooks[index] || deps.some((value, i) => !Object.is(value, hooks[index].deps[i]))) {
                hooks[index]?.cleanup?.();
                hooks[index] = { deps, cleanup: callback() };
            }
        },
        async createStory(data) {
            calls.create.push(data);
            await result(outcomes.create);
            return { ...data, _id: 'created' };
        },
        async updateStory(id, data) {
            calls.update.push([id, data]);
            await result(outcomes.update);
            return { ...data, _id: id };
        },
        async syncStoryFilesVisibility(id, visibility) {
            calls.sync.push([id, visibility]);
            await result(outcomes.sync);
            records.forEach((record) => { if (record.story_id === id) record.visibility = visibility; });
        },
        uploadUserFiles,
    });
    const props = {
        authorName: 'Author',
        story: editing ? { _id: 'existing', title: 'Title', description: 'Description', content: 'Content' } : null,
        async onSaved() { calls.saved.push([]); await result(outcomes.saved); },
        onClose() { calls.close.push([]); },
    };
    const render = () => { cursor = 0; return Modal(props); };
    const change = (name, value) => render().changeHandler({ target: { name, value } });
    if (!editing) {
        change('title', 'Title'); change('description', 'Description'); change('content', 'Content');
    }
    return {
        render, change, attempts, metadataAttempts, objects, records, removals, calls, outcomes,
        select(files) { render().fileChangeHandler({ target: { files } }); },
        submit: () => render().submitHandler({ preventDefault() {} }),
        count: (attachment) => attempts.filter((attempt) => attempt.file === attachment).length,
        fail(attachment, times = 1, stage = 'storage') {
            outcomes[stage].set(attachment, Array.from({ length: times }, () => new Error('Mock failure')));
        },
        success() {
            assert.equal(render().error, '');
            assert.equal(render().isSubmitting, false);
            assert.equal(calls.close.length, 1);
            assert.equal(calls.create.length, editing ? 0 : 1);
        },
        failed() {
            assert.equal(render().error, 'saveError');
            assert.equal(render().isSubmitting, false);
            assert.equal(calls.close.length, 0);
        },
        dispose() { hooks.forEach((hook) => hook.cleanup?.()); },
    };
}

async function test(label, run, options) {
    const h = harness(options);
    try { await run(h); console.log(`PASS: ${label}`); }
    finally { h.dispose(); }
}

await test('single successful attachment stores one object and metadata record', async (h) => {
    const a = file('A.jpg');
    h.select([a]);
    await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.objects.size, 1);
    assert.equal(h.records.length, 1);
    assert.equal(h.render().pendingFiles.length, 0);
    assert.equal(h.render().currentUploads[0].file, a);
    h.success();
});

await test('A succeeds once while B fails repeatedly; final retry completes on the same story', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b, 2);
    for (let attempt = 1; attempt <= 2; attempt++) {
        await h.submit(); h.failed();
        assert.equal(h.count(a), 1);
        assert.equal(h.count(b), attempt);
        assert.equal(h.records.length, 1);
        assert.equal(h.render().currentUploads[0].file, a);
        assert.equal(h.render().pendingFiles[0], b);
    }
    await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.count(b), 3);
    assert.equal(h.objects.size, 2);
    assert.equal(h.records.length, 2);
    assert.ok(h.records.every((record) => record.story_id === 'created'));
    assert.equal(h.removals.length, 0);
    h.success();
});

await test('A and B succeed, C fails, then only C retries', async (h) => {
    const files = ['A.jpg', 'B.jpg', 'C.jpg'].map(file);
    h.select(files); h.fail(files[2]);
    await h.submit(); h.failed();
    assert.equal(h.records.length, 2);
    await h.submit();
    assert.deepEqual(files.map(h.count), [1, 1, 2]);
    assert.equal(h.records.length, 3);
    assert.equal(h.objects.size, 3);
    h.success();
});

await test('first-file failure stops the batch and does not mark any file complete', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(a);
    await h.submit(); h.failed();
    assert.equal(h.count(b), 0);
    assert.equal(h.records.length, 0);
    assert.equal(h.render().currentUploads.length, 0);
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [2, 1]);
    h.success();
});

await test('metadata failure is not marked complete and only its failed object is cleaned up', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b, 1, 'metadata');
    await h.submit(); h.failed();
    assert.equal(h.records.length, 1);
    assert.equal(h.objects.size, 1);
    assert.equal(h.removals.length, 1);
    assert.notEqual(h.removals[0], h.attempts[0].path);
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 2]);
    assert.equal(h.objects.size, 2);
    assert.equal(h.records.length, 2);
    h.success();
});

await test('removing a successful file from selection retains its remote attachment and visible status', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.select([b]);
    assert.equal(h.render().currentUploads[0].file, a);
    assert.equal(h.records[0].file_name, 'A.jpg');
    await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.records.length, 2);
    assert.equal(h.removals.length, 0);
    h.success();
});

await test('clearing all pending files preserves completed attachments', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.select([]);
    await h.submit();
    assert.equal(h.count(b), 1);
    assert.equal(h.records.length, 1);
    assert.equal(h.render().currentUploads[0].file, a);
    assert.equal(h.removals.length, 0);
    h.success();
});

await test('completed selection can be reintroduced by reference without another upload', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.select([]); h.select([a, b]);
    await h.submit();
    assert.equal(h.count(a), 1);
    h.success();
});

await test('distinct File objects with identical metadata are separate explicit selections', async (h) => {
    const a = file('same.jpg'); const b = file('same.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 2]);
    assert.equal(h.records.length, 2);
    h.success();
});

await test('fresh modal/story resets tracking even for reused File objects', async (h) => {
    const a = file('A.jpg');
    h.select([a]); await h.submit(); h.success();
    const fresh = harness();
    try {
        fresh.select([a]); await fresh.submit(); fresh.success();
        assert.equal(fresh.count(a), 1);
    } finally { fresh.dispose(); }
});

await test('edit flow keeps existing attachment and retries only failed new attachments', async (h) => {
    const existing = h.records[0];
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit(); h.failed();
    await h.submit();
    assert.equal(h.records[0], existing);
    assert.equal(h.records.length, 3);
    assert.deepEqual([h.count(a), h.count(b)], [1, 2]);
    assert.ok(h.records.every((record) => record.story_id === 'existing'));
    assert.equal(h.removals.length, 0);
    h.success();
}, { editing: true });

await test('visibility changes update successful attachments without reuploading them', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.change('visibility', 'private');
    await h.submit();
    assert.equal(h.count(a), 1);
    assert.ok(h.records.every((record) => record.visibility === 'private'));
    h.success();
});

await test('failed onSaved callback retries completion without reuploading successful files', async (h) => {
    const a = file('A.jpg');
    h.select([a]); h.outcomes.saved.push(new Error('Refresh failed'));
    await h.submit(); h.failed();
    await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.records.length, 1);
    h.success();
});

await test('concurrent submits cannot duplicate a pending upload or create another story', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    const pending = deferred();
    h.select([a, b]); h.outcomes.storage.set(b, [pending.promise]);
    const handler = h.render().submitHandler;
    const event = { preventDefault() {} };
    const first = handler(event);
    await handler(event);
    await setImmediate();
    assert.equal(h.render().isSubmitting, true);
    assert.equal(h.records.length, 1);
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 1]);
    assert.equal(h.calls.create.length, 1);
    pending.resolve(); await first;
    assert.equal(h.records.length, 2);
    h.success();
});

console.log('ATTACHMENT RETRY 01: PASS');
