import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/pages/MyFilesPage.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function MyFilesPage(');
const end = source.search(/\n    return \(\r?\n        <main/);
assert.ok(start >= 0 && end > start, 'Locate production component before JSX');
const pageSource = `${source.slice(start, end)}
    return { files, selectedFiles, visibility, uploading, loading, error,
        setSelectedFiles, setVisibility, uploadHandler, visibilityHandler, deleteHandler };
}
MyFilesPage;`;
const service = readFileSync(new URL('../src/services/fileService.js', import.meta.url), 'utf8');
const serviceStart = service.indexOf('const MAX_FILE_SIZE');
const serviceEnd = service.indexOf('export async function fetchMyFiles');
assert.ok(serviceStart >= 0 && serviceEnd > serviceStart);
const uploadSource = `${service.slice(serviceStart, serviceEnd).replace('export async function', 'async function')}
uploadUserFiles;`;
// Execute actual page handlers and upload service with a mocked SDK. No service
// imports, network, Supabase project, or remote storage are used.
const file = (name) => ({ name, type: 'image/jpeg', size: 100, lastModified: 123 });
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness() {
    const hooks = [];
    let cursor = 0;
    const effects = [];
    let user = { id: 'owner' };
    let sequence = 0;
    let resets = 0;
    const attempts = [];
    const objects = new Map();
    const records = [];
    const removals = [];
    const calls = { fetch: [], visibility: [], delete: [] };
    const outcomes = { storage: new Map(), metadata: new Map(), fetch: [] };
    async function result(queue) {
        const value = await queue?.shift();
        if (value instanceof Error) throw value;
        return value;
    }
    const supabase = {
        auth: { getUser: async () => ({ data: { user } }) },
        storage: {
            from(bucket) {
                assert.equal(bucket, 'user-files');
                return {
                    async upload(path, attachment, options) {
                        assert.equal(options.upsert, false);
                        attempts.push({ path, file: attachment });
                        try { await result(outcomes.storage.get(attachment)); }
                        catch (error) { return { error }; }
                        assert.equal(objects.has(path), false, 'Each new object has a distinct path');
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
            return { insert(row) {
                return { select: () => ({ single: async () => {
                    const attachment = objects.get(row.storage_path);
                    try { await result(outcomes.metadata.get(attachment)); }
                    catch (error) { return { error, data: null }; }
                    const data = { ...row, id: `file-${++sequence}` };
                    records.push(data);
                    return { data, error: null };
                } }) };
            } };
        },
    };
    const uploadUserFiles = runInNewContext(uploadSource, { supabase });
    const Page = runInNewContext(pageSource, {
        uploadUserFiles,
        useAuth: () => ({ user }),
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        useState(initial) {
            const index = cursor++;
            const slot = hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [slot.value, (next) => { slot.value = typeof next === 'function' ? next(slot.value) : next; }];
        },
        useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
        useCallback(callback, deps) {
            const index = cursor++;
            if (!hooks[index] || deps.some((value, i) => !Object.is(value, hooks[index].deps[i]))) {
                hooks[index] = { deps, callback };
            }
            return hooks[index].callback;
        },
        useEffect(callback, deps) {
            const index = cursor++;
            const previous = hooks[index];
            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                effects.push(() => {
                    previous?.cleanup?.();
                    hooks[index] = { deps, cleanup: callback() };
                });
            }
        },
        async fetchMyFiles(id) {
            calls.fetch.push(id);
            await result(outcomes.fetch);
            return records.filter((record) => record.user_id === id)
                .map((record) => ({ ...record, url: `mock:${record.storage_path}` }));
        },
        async updateUserFileVisibility(id, visibility) {
            calls.visibility.push([id, visibility]);
            records.find((record) => record.id === id).visibility = visibility;
        },
        async deleteUserFile(record) {
            calls.delete.push(record.id);
            records.splice(records.findIndex((item) => item.id === record.id), 1);
            objects.delete(record.storage_path);
        },
    });
    const render = () => {
        cursor = 0;
        const view = Page();
        effects.splice(0).forEach((effect) => effect());
        return view;
    };
    const event = { preventDefault() {}, currentTarget: { reset() { resets++; } } };
    return {
        render, attempts, objects, records, removals, calls, outcomes, event,
        select: (files) => render().setSelectedFiles(files),
        submit: () => render().uploadHandler(event),
        count: (attachment) => attempts.filter((attempt) => attempt.file === attachment).length,
        fail(attachment, times = 1, stage = 'storage') {
            outcomes[stage].set(attachment, Array.from({ length: times }, () => new Error('Mock failure')));
        },
        user: (id) => { user = { id }; render(); },
        resets: () => resets,
        success(expectedCount) {
            const view = render();
            assert.equal(view.error, '');
            assert.equal(view.uploading, false);
            assert.equal(view.selectedFiles.length, 0);
            assert.equal(view.files.length, expectedCount);
            assert.ok(view.files.every((record) => record.url.startsWith('mock:')));
        },
        failed(key = 'uploadError') {
            assert.equal(render().error, key);
            assert.equal(render().uploading, false);
            assert.ok(render().selectedFiles.length > 0);
            assert.equal(resets, 0);
        },
        dispose: () => hooks.forEach((hook) => hook.cleanup?.()),
    };
}

let checks = 0;
async function test(label, run) {
    const h = harness();
    h.render();
    await setImmediate();
    try { await run(h); checks++; console.log(`PASS: ${label}`); }
    finally { h.dispose(); }
}

await test('single file creates one object/record and refreshes the list', async (h) => {
    const a = file('A.jpg');
    h.select([a]); await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.records.length, 1);
    assert.equal(h.objects.size, 1);
    assert.equal(h.records[0].story_id, null);
    assert.equal(h.records[0].visibility, 'private');
    assert.equal(h.calls.fetch.length, 2);
    assert.equal(h.resets(), 1);
    h.success(1);
});

await test('A succeeds; repeated B failures never reupload A; final retry completes', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b, 2);
    for (let attempt = 1; attempt <= 2; attempt++) {
        await h.submit(); h.failed();
        assert.equal(h.count(a), 1);
        assert.equal(h.count(b), attempt);
        assert.equal(h.records.length, 1);
        assert.equal(h.objects.size, 1);
    }
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 3]);
    assert.equal(h.objects.size, 2);
    assert.equal(h.records.length, 2);
    assert.equal(h.removals.length, 0);
    h.success(2);
});

await test('A+B succeed, C fails, retry uploads only C', async (h) => {
    const files = ['A.jpg', 'B.jpg', 'C.jpg'].map(file);
    h.select(files); h.fail(files[2]);
    await h.submit(); h.failed();
    assert.equal(h.records.length, 2);
    await h.submit();
    assert.deepEqual(files.map(h.count), [1, 1, 2]);
    assert.equal(h.objects.size, 3);
    h.success(3);
});

await test('first-file failure stops the batch and does not mark anything complete', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(a);
    await h.submit(); h.failed();
    assert.equal(h.count(b), 0);
    assert.equal(h.records.length, 0);
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [2, 1]);
    h.success(2);
});

await test('metadata failure cleans only the failed object and permits its retry', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b, 1, 'metadata');
    await h.submit(); h.failed();
    assert.equal(h.records.length, 1);
    assert.equal(h.objects.size, 1);
    assert.deepEqual(h.removals, [h.attempts[1].path]);
    assert.ok(h.objects.has(h.attempts[0].path));
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 2]);
    assert.equal(h.objects.size, 2);
    h.success(2);
});

await test('selection changes preserve remote successes and upload newly selected files', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg'); const c = file('C.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.select([b, c]); await h.submit();
    assert.deepEqual([a, b, c].map(h.count), [1, 2, 1]);
    assert.equal(h.removals.length, 0);
    assert.ok(h.records.some((record) => record.file_name === 'A.jpg'));
    h.success(3);
});

await test('clearing/reintroducing the same pending File references retains completion tracking', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.select([]); await h.submit();
    assert.equal(h.render().error, 'chooseError');
    assert.equal(h.records.length, 1);
    h.select([a, b]); await h.submit();
    assert.equal(h.count(a), 1);
    assert.equal(h.removals.length, 0);
    h.success(2);
});

await test('new File objects with identical metadata remain distinct selections', async (h) => {
    const a = file('same.jpg'); const b = file('same.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit(); await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 2]);
    h.success(2);
});

await test('a fresh batch after completion resets tracking even for reused references', async (h) => {
    const a = file('A.jpg');
    h.select([a]); await h.submit();
    h.select([a]); await h.submit();
    assert.equal(h.count(a), 2);
    assert.equal(h.resets(), 2);
    h.success(2);
});

await test('fresh page instance has independent upload tracking', async (h) => {
    const a = file('A.jpg');
    h.select([a]); await h.submit();
    const fresh = harness();
    try {
        fresh.render(); await setImmediate();
        fresh.select([a]); await fresh.submit();
        assert.equal(fresh.count(a), 1);
        fresh.success(1);
    } finally { fresh.dispose(); }
});

await test('repeated list refresh failures retry only the read, never successful uploads', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]);
    h.outcomes.fetch.push(new Error('Read failed'), new Error('Read failed again'));
    for (let retry = 0; retry < 2; retry++) {
        await h.submit(); h.failed('loadError');
        assert.deepEqual([h.count(a), h.count(b)], [1, 1]);
        assert.equal(h.records.length, 2);
    }
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 1]);
    assert.equal(h.calls.fetch.length, 4);
    h.success(2);
});

await test('concurrent submit is blocked before render, during storage, and during refresh', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    const storage = deferred(); const refresh = deferred();
    h.select([a, b]);
    h.outcomes.storage.set(b, [storage.promise]);
    h.outcomes.fetch.push(refresh.promise);
    const handler = h.render().uploadHandler;
    const pending = handler(h.event);
    await handler(h.event);
    await setImmediate();
    assert.equal(h.render().uploading, true);
    await h.submit();
    assert.deepEqual([h.count(a), h.count(b)], [1, 1]);
    storage.resolve(); await setImmediate();
    await h.submit();
    assert.equal(h.render().uploading, true);
    assert.equal(h.calls.fetch.length, 2);
    refresh.resolve(); await pending;
    assert.equal(h.resets(), 1);
    h.success(2);
});

await test('visibility applies to pending files without silently changing successful files', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.render().setVisibility('community');
    await h.submit();
    assert.equal(h.records[0].visibility, 'private');
    assert.equal(h.records[1].visibility, 'community');
    assert.equal(h.records[1].moderation_status, 'pending');
    assert.equal(h.count(a), 1);
    assert.equal(h.calls.visibility.length, 0);
    h.success(2);
});

await test('new account cannot inherit the old account completed-file tracking', async (h) => {
    const a = file('A.jpg'); const b = file('B.jpg');
    h.select([a, b]); h.fail(b);
    await h.submit();
    h.user('other'); await setImmediate();
    h.select([a]); await h.submit();
    assert.equal(h.count(a), 2);
    assert.deepEqual(h.records.map((record) => record.user_id), ['owner', 'other']);
    h.success(1);
});

await test('existing visibility/share and delete handlers still mutate then refresh', async (h) => {
    h.select([file('A.jpg')]); await h.submit();
    const record = h.render().files[0];
    await h.render().visibilityHandler(record);
    assert.deepEqual(h.calls.visibility, [[record.id, 'community']]);
    assert.equal(h.render().files[0].visibility, 'community');
    await h.render().deleteHandler(h.render().files[0]);
    assert.deepEqual(h.calls.delete, [record.id]);
    assert.equal(h.render().files.length, 0);
    assert.equal(h.calls.fetch.length, 4);
    assert.equal(h.attempts.length, 1);
});

console.log(`${checks} mocked checks; no network requests.`);
console.log('MYFILES UPLOAD RETRY 01: PASS');
