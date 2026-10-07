import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const variants = [
    { name: 'MediaRating', path: 'src/components/MediaRating.jsx', service: 'fileRatingService', fetch: 'fetchFileRatings', save: 'saveFileRating', target: 'fileId', column: 'file_id', loadError: 'loadError', saveError: 'saveError' },
    { name: 'HeritageRating', path: 'src/components/heritage/HeritageRating.jsx', service: 'heritageRatingService', fetch: 'fetchHeritageRatings', save: 'saveHeritageRating', target: 'articleSlug', column: 'article_slug', loadError: 'heritageRatingLoadError', saveError: 'heritageRatingSaveError' },
];
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness(v) {
    const source = readFileSync(new URL(`../${v.path}`, import.meta.url), 'utf8');
    const start = source.indexOf(`function ${v.name}ForTarget(`);
    const end = source.indexOf('\n    return (', start);
    assert.ok(start >= 0 && end > start);
    assert.match(source, /disabled=\{[^}]*saving \|\| loading/);
    assert.match(source, /onClick=\{retryHandler\}/, 'Recovery is connected to the UI');
    assert.match(source, /\{t\(error\)\}/, 'Error keys are translated at render');
    const componentSource = `${source.slice(start, end)}
        return { ratingInfo, loading, saving, error, ratingHandler, retryHandler };
    }
    ${v.name}ForTarget;`;
    const keyExpression = source.match(/key=\{(JSON\.stringify\([^\n]+)\}/)?.[1];
    assert.ok(keyExpression);
    const getKey = runInNewContext(`({ fileId, articleSlug, user, ownerId, isActive }) => ${keyExpression}`);
    const serviceSource = readFileSync(new URL(`../src/services/${v.service}.js`, import.meta.url), 'utf8');
    const executableService = serviceSource.slice(serviceSource.indexOf('export async function')).replaceAll('export async function', 'async function');
    let props = { fileId: 'A', articleSlug: 'A', user: { id: 'reader' }, ownerId: 'owner', isActive: true };
    let language = 'en';
    const records = [];
    const reads = [];
    const writes = [];
    const outcomes = { read: [], write: [] };
    const instances = [];
    let current;

    // Real rating services run against this in-memory SDK, including their
    // insert/update choice and average/count/current-user calculations.
    function query(mode, payload) {
        const filters = {};
        let signal;
        return {
            eq(key, value) { filters[key] = value; return this; },
            abortSignal(value) { signal = value; return this; },
            then(resolve, reject) {
                const run = async () => {
                    if (mode === 'read') {
                        reads.push({ ...filters, signal });
                        const snapshot = records.filter((row) => row[v.column] === filters[v.column]).map((row) => ({ ...row }));
                        try {
                            const data = outcomes.read.length ? await outcomes.read.shift() : snapshot;
                            if (data instanceof Error) throw data;
                            return { data, error: null };
                        } catch (error) { return { data: null, error }; }
                    }
                    writes.push({ mode, payload, filters });
                    let outcome;
                    try {
                        outcome = await outcomes.write.shift();
                        if (outcome instanceof Error) throw outcome;
                    } catch (error) { return { error }; }
                    if (mode === 'insert') {
                        const duplicate = records.some((row) => row[v.column] === payload[v.column] && row.user_id === payload.user_id);
                        if (duplicate) return { error: { message: 'Duplicate rating' } };
                        records.push({ ...payload });
                    } else {
                        const row = records.find((row) => row[v.column] === filters[v.column] && row.user_id === filters.user_id);
                        if (!row) return { error: { message: 'Missing rating' } };
                        Object.assign(row, payload);
                    }
                    return { error: outcome?.committedError ? { message: 'Response lost after commit' } : null };
                };
                return run().then(resolve, reject);
            },
        };
    }
    const supabase = { from: () => ({
        select: () => query('read'),
        insert: (row) => query('insert', row),
        update: (row) => query('update', row),
    }) };
    const services = runInNewContext(`${executableService}\n({ ${v.fetch}, ${v.save} });`, { supabase });

    function mount(key) {
        const instance = { key, hooks: [], cursor: 0, effects: [], mounted: true, lateUpdates: 0 };
        const Component = runInNewContext(componentSource, {
            ...services, AbortController,
            useLanguage: () => ({ language }),
            getTranslation: (_language, _section, name) => name,
            useState(initial) {
                const index = instance.cursor++;
                const slot = instance.hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
                return [slot.value, (next) => {
                    if (!instance.mounted) { instance.lateUpdates++; return; }
                    slot.value = typeof next === 'function' ? next(slot.value) : next;
                }];
            },
            useRef(initial) { return instance.hooks[instance.cursor++] ??= { current: initial }; },
            useCallback(callback) { return callback; },
            useEffect(callback, deps) {
                const index = instance.cursor++;
                const previous = instance.hooks[index];
                if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                    instance.effects.push(() => {
                        previous?.cleanup?.();
                        instance.hooks[index] = { deps, callback, cleanup: callback() };
                    });
                }
            },
        });
        instance.render = () => {
            instance.cursor = 0;
            const view = Component(props);
            instance.effects.splice(0).forEach((effect) => effect());
            return view;
        };
        instance.unmount = () => {
            instance.hooks.forEach((slot) => slot.cleanup?.());
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
    return {
        render, records, reads, writes, outcomes, instances,
        rate: (rating) => render().ratingHandler(rating),
        retry: () => render().retryHandler(),
        settle: async () => { await setImmediate(); return render(); },
        change: (next) => { props = { ...props, ...next }; return render(); },
        target: (id) => { props = { ...props, [v.target]: id }; return render(); },
        language: (next) => { language = next; return render(); },
        row: (rating, id = 'A', userId = 'reader') => ({ rating, [v.column]: id, user_id: userId }),
        replayEffects() {
            const effects = current.hooks.filter((slot) => slot.callback);
            effects.forEach((slot) => slot.cleanup?.());
            effects.forEach((slot) => { slot.cleanup = slot.callback(); });
        },
        dispose: () => current?.unmount(),
    };
}

let checks = 0;
for (const v of variants) {
    async function test(label, run) {
        const h = harness(v);
        try { await run(h); checks++; console.log(`PASS: ${v.name}: ${label}`); }
        finally { h.dispose(); }
    }
    async function ready(h) { h.render(); await h.settle(); }
    function info(h, rating, count = 1, average = rating) {
        const view = h.render();
        assert.equal(view.ratingInfo.userRating, rating);
        assert.equal(view.ratingInfo.count, count);
        assert.equal(view.ratingInfo.average, average);
        assert.equal(view.loading, false);
        assert.equal(view.saving, false);
        assert.equal(view.error, '');
    }

    await test('initial read blocks writes; first rating inserts once and updates totals', async (h) => {
        const pending = deferred(); h.outcomes.read.push(pending.promise);
        h.render(); await h.rate(5);
        assert.equal(h.writes.length, 0);
        assert.equal(h.render().loading, true);
        pending.resolve([]); await h.settle();
        await h.rate(5);
        assert.equal(h.writes.length, 1);
        assert.equal(h.writes[0].mode, 'insert');
        info(h, 5);
    });

    await test('existing rating updates once and preserves other-user totals', async (h) => {
        h.records.push(h.row(2), h.row(4, 'A', 'other'));
        await ready(h); await h.rate(4);
        assert.equal(h.writes.length, 1);
        assert.equal(h.writes[0].mode, 'update');
        assert.equal(h.records.length, 2);
        info(h, 4, 2, 4);
    });

    await test('rapid clicks cannot overlap writes or their follow-up reads', async (h) => {
        await ready(h);
        const write = deferred(); const read = deferred();
        h.outcomes.write.push(write.promise); h.outcomes.read.push(read.promise);
        const handler = h.render().ratingHandler;
        const saving = handler(3);
        await handler(5); await h.settle();
        assert.equal(h.writes.length, 1);
        write.resolve(); await h.settle();
        await h.rate(4); await h.retry();
        assert.equal(h.writes.length, 1);
        assert.equal(h.render().saving, true);
        read.resolve([h.row(3)]); await saving;
        info(h, 3);
        await h.rate(5);
        assert.equal(h.writes[1].mode, 'update');
        info(h, 5);
    });

    await test('failed initial read stays gated; retry success clears error', async (h) => {
        h.outcomes.read.push(new Error('Read failed'));
        await ready(h); await h.rate(5);
        assert.equal(h.render().error, v.loadError);
        assert.equal(h.render().loading, true);
        assert.equal(h.writes.length, 0);
        await h.retry(); await h.rate(4);
        info(h, 4);
    });

    await test('failed write requires reconciliation before another write', async (h) => {
        await ready(h); h.outcomes.write.push(new Error('Write failed'));
        await h.rate(2);
        assert.equal(h.render().error, v.saveError);
        assert.equal(h.render().saving, false);
        await h.rate(5); assert.equal(h.writes.length, 1);
        await h.retry(); await h.rate(5);
        assert.equal(h.writes[1].mode, 'insert');
        info(h, 5);
    });

    for (const lostResponse of [false, true]) {
        await test(`${lostResponse ? 'ambiguous committed write failure' : 'successful insert + failed refresh'} cannot cause a second insert`, async (h) => {
            await ready(h);
            if (lostResponse) h.outcomes.write.push({ committedError: true });
            else h.outcomes.read.push(new Error('Refresh failed'));
            await h.rate(3);
            assert.equal(h.records.length, 1);
            assert.equal(h.render().error, lostResponse ? v.saveError : v.loadError);
            await h.rate(5); assert.equal(h.writes.length, 1);
            h.outcomes.read.push(new Error('Retry read failed'));
            await h.retry(); await h.rate(5);
            assert.equal(h.writes.length, 1);
            await h.retry(); await h.rate(5);
            assert.equal(h.writes[1].mode, 'update');
            assert.equal(h.records.length, 1);
            info(h, 5);
        });
    }

    await test('superseded Strict Mode initial read cannot overwrite a later mutation', async (h) => {
        const old = deferred(); h.outcomes.read.push(old.promise);
        h.render(); await h.settle();
        h.replayEffects(); await h.settle(); await h.rate(4);
        old.resolve([]); await h.settle();
        info(h, 4);
    });

    for (const phase of ['read', 'write', 'refresh']) {
        for (const fails of [false, true]) {
            await test(`old ${phase} ${fails ? 'error' : 'success'} cannot change the new target or unlock its request`, async (h) => {
                const old = deferred();
                let pending;
                if (phase === 'read') { h.outcomes.read.push(old.promise); h.render(); }
                else {
                    await ready(h);
                    h.outcomes[phase === 'write' ? 'write' : 'read'].push(old.promise);
                    pending = h.rate(2);
                }
                await h.settle();
                const next = deferred(); h.outcomes.read.push(next.promise);
                h.target('B'); await h.settle();
                assert.equal(h.render().ratingInfo.count, 0);
                assert.equal(h.render().error, '');
                const lateWrites = h.instances[0].lateUpdates;
                if (fails) old.reject(new Error('Old failure'));
                else old.resolve(phase === 'write' ? undefined : [h.row(2)]);
                if (pending) await pending;
                await h.settle();
                assert.equal(h.instances[0].lateUpdates, lateWrites);
                assert.equal(h.render().loading, true);
                assert.equal(h.render().error, '');
                next.resolve([]); await h.settle();
                await h.rate(5); info(h, 5);
            });
        }
    }

    await test('old mutation completion cannot finish a new target mutation', async (h) => {
        await ready(h);
        const old = deferred(); h.outcomes.write.push(old.promise);
        const first = h.rate(2); await h.settle();
        h.target('B'); await h.settle();
        const next = deferred(); h.outcomes.write.push(next.promise);
        const second = h.rate(5); await h.settle();
        old.resolve(); await first;
        assert.equal(h.render().saving, true);
        await h.rate(1); assert.equal(h.writes.length, 2);
        next.resolve(); await second; info(h, 5);
    });

    await test('account change resets old rating/error and reads the new user rating', async (h) => {
        h.records.push(h.row(2), h.row(4, 'A', 'other'));
        await ready(h);
        h.outcomes.write.push(new Error('Write failed')); await h.rate(3);
        const view = h.change({ user: { id: 'other' } });
        assert.equal(view.ratingInfo.count, 0);
        assert.equal(view.error, '');
        assert.equal(view.loading, true);
        await h.settle(); info(h, 4, 2, 3);
    });

    for (const fails of [false, true]) {
        await test(`unmount blocks late mutation/refresh ${fails ? 'error' : 'success'}`, async (h) => {
            await ready(h);
            const late = deferred(); h.outcomes.read.push(late.promise);
            const pending = h.rate(3); await h.settle(); h.dispose();
            if (fails) late.reject(new Error('Late failure')); else late.resolve([h.row(3)]);
            await pending;
            assert.equal(h.instances[0].lateUpdates, 0);
        });
    }

    await test('language/same-user rerenders do not refetch or reset a pending save', async (h) => {
        await ready(h);
        const pending = deferred(); h.outcomes.write.push(pending.promise);
        const saving = h.rate(4); await h.settle();
        h.language('bg'); h.change({ user: { id: 'reader' } });
        assert.equal(h.reads.length, 1);
        assert.equal(h.render().saving, true);
        pending.resolve(); await saving; info(h, 4);
    });

    await test('guest and existing owner/inactive eligibility restrictions remain enforced', async (h) => {
        await ready(h);
        h.change({ user: null }); await h.settle(); await h.rate(5);
        h.change(v.name === 'MediaRating' ? { user: { id: 'owner' } } : { user: { id: 'reader' }, isActive: false });
        await h.settle(); await h.rate(5);
        assert.equal(h.writes.length, 0);
    });
}

console.log(`${checks} mocked checks using both production components and rating services; no network.`);
console.log('RATING RACE 01: PASS');
