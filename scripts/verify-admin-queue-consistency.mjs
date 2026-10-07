import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/AdminPage.jsx');
const service = read('src/services/adminService.js');
const start = page.indexOf('function AdminDashboard(');
const end = page.indexOf('    function storyActions(', start);
assert.ok(start >= 0 && end > start);
const componentSource = `${page.slice(start, end)}
    return { data, loading, error, message, busyKey, pendingStories, pendingFiles,
        refreshDashboard, runAction, openMemberDetails, closeMemberDetails,
        memberDetails, memberDetailsLoading };
}
AdminDashboard;`;
const keyExpression = page.match(/key=\{(JSON\.stringify\([^\n]+)\}/)?.[1];
assert.ok(keyExpression);
const getKey = runInNewContext(`({ user, isAdmin, accountStatus }) => ${keyExpression}`);
const serviceSource = `${service.slice(service.indexOf('const MODERATION_STATUSES')).replaceAll('export async function', 'async function')}
({ fetchAdminDashboard, moderateStory, moderateFile, adminDeleteStory,
    adminDeleteFile, setMemberAccountStatus, fetchAdminMemberDetails });`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
const clone = (value) => structuredClone(value);
function fixture() {
    const pending = (id) => ({ id, title: id, file_name: id, author_id: 'member', user_id: 'member',
        visibility: 'community', moderation_status: 'pending', created_at: '2020', storage_path: id });
    return {
        profiles: [{ id: 'member', display_name: 'Member', created_at: '2020' }],
        user_roles: [{ user_id: 'member', role: 'user', account_status: 'active' }],
        stories: [...Array.from({ length: 60 }, (_, i) => ({ ...pending(`recent-${i}`), created_at: '2026', moderation_status: 'approved' })), pending('story-A'), pending('story-B')],
        user_files: [pending('file-A'), pending('file-B')],
        story_ratings: [{ story_id: 'story-A', user_id: 'member', rating: 4 }],
        file_ratings: [{ file_id: 'file-A', user_id: 'member', rating: 5 }],
    };
}

function harness() {
    // Both actual dashboard services and actual component handlers run locally.
    // This SDK imitates query filters, ordering, limits, pagination, and writes.
    const db = fixture();
    let auth = { user: { id: 'admin' }, isAdmin: true, accountStatus: 'active' };
    let language = 'en';
    let maxRows = 1000;
    const calls = { queries: [], writes: [], dashboards: [], removals: [] };
    const outcomes = { dashboard: [], mutation: [], details: [], query: [] };
    function query(table) {
        const spec = { table, mode: 'read', filters: [], orders: [], options: {}, limit: Infinity, range: null };
        return {
            select(_columns, options = {}) { spec.options = options; return this; },
            eq(key, value) { spec.filters.push([key, value]); return this; },
            order(key, options) { spec.orders.push([key, options.ascending]); return this; },
            limit(value) { spec.limit = value; return this; },
            range(from, to) { spec.range = [from, to]; return this; },
            abortSignal(signal) { spec.signal = signal; return this; },
            update(value) { spec.mode = 'update'; spec.payload = value; return this; },
            delete() { spec.mode = 'delete'; return this; },
            then(resolve, reject) {
                const execute = async () => {
                    calls.queries.push(spec);
                    const matches = (row) => spec.filters.every(([key, value]) => row[key] === value);
                    if (spec.mode !== 'read') {
                        calls.writes.push(spec);
                        const outcome = await outcomes.mutation.shift();
                        if (outcome instanceof Error) return { error: outcome };
                        if (spec.mode === 'delete') db[table] = db[table].filter((row) => !matches(row));
                        else db[table].filter(matches).forEach((row) => Object.assign(row, spec.payload));
                        return { error: null };
                    }
                    if (outcomes.query.length) return { error: outcomes.query.shift() };
                    const rows = db[table].filter(matches);
                    if (spec.options.head) return { count: rows.length, error: null };
                    rows.sort((a, b) => {
                        for (const [key, ascending] of spec.orders) {
                            const cmp = String(a[key]).localeCompare(String(b[key]));
                            if (cmp) return ascending ? cmp : -cmp;
                        }
                        return 0;
                    });
                    const offset = spec.range?.[0] ?? 0;
                    if (offset > 0 && offset >= rows.length) return { error: { message: 'Requested range not satisfiable' } };
                    const requested = spec.range ? spec.range[1] - offset + 1 : spec.limit;
                    return { data: clone(rows.slice(offset, offset + Math.min(requested, maxRows))), count: spec.options.count === 'exact' ? rows.length : null, error: null };
                };
                return execute().then(resolve, reject);
            },
        };
    }
    const supabase = {
        from: query,
        auth: { getUser: async () => ({ data: { user: auth.user } }) },
        storage: { from: () => ({ remove: async (paths) => { calls.removals.push(...paths); return { error: null }; } }) },
        rpc: async () => {
            const result = outcomes.details.length ? await outcomes.details.shift() : { display_name: 'Member' };
            if (result instanceof Error) return { error: result };
            return { data: result, error: null };
        },
    };
    const services = runInNewContext(serviceSource, { supabase });
    const instances = [];
    let current;
    function mount(key) {
        const instance = { key, slots: [], cursor: 0, effects: [], mounted: true, lateUpdates: 0 };
        const memo = (callback, deps) => {
            const index = instance.cursor++;
            if (!instance.slots[index] || deps.some((value, i) => !Object.is(value, instance.slots[index].deps[i]))) {
                instance.slots[index] = { deps, value: callback() };
            }
            return instance.slots[index].value;
        };
        const Component = runInNewContext(componentSource, {
            ...services, AbortController,
            fetchAdminDashboard: async (options) => {
                calls.dashboards.push(options);
                if (outcomes.dashboard.length) {
                    const result = await outcomes.dashboard.shift();
                    if (result instanceof Error) throw result;
                    return result;
                }
                return services.fetchAdminDashboard(options);
            },
            useLanguage: () => ({ language }),
            getTranslation: (_language, _namespace, key) => key,
            formatDate: () => '',
            useMemo: memo,
            useCallback: (fn, deps) => memo(() => fn, deps),
            useRef: (initial) => instance.slots[instance.cursor++] ??= { current: initial },
            useState(initial) {
                const index = instance.cursor++;
                const slot = instance.slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
                return [slot.value, (next) => {
                    if (!instance.mounted) { instance.lateUpdates++; return; }
                    slot.value = typeof next === 'function' ? next(slot.value) : next;
                }];
            },
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
            instance.cursor = 0;
            const view = Component({ user: auth.user });
            instance.effects.splice(0).forEach((effect) => effect());
            return view;
        };
        instance.dispose = () => { instance.slots.forEach((slot) => slot.cleanup?.()); instance.mounted = false; };
        instances.push(instance);
        return instance;
    }
    function render() {
        const key = getKey(auth);
        if (!current || current.key !== key) { current?.dispose(); current = mount(key); }
        return current.render();
    }
    return {
        db, calls, outcomes, services, instances, render,
        settle: async () => { await setImmediate(); return render(); },
        refresh: () => render().refreshDashboard(),
        action: (fn) => render().runAction('action', 'success', fn),
        context: (next) => { auth = { ...auth, ...next }; return render(); },
        language: (next) => { language = next; return render(); },
        cap: (value) => { maxRows = value; },
        snapshot: () => services.fetchAdminDashboard(),
        dispose: () => current?.dispose(),
        replayEffects: () => {
            const effects = current.slots.filter((slot) => slot.callback);
            effects.forEach((slot) => slot.cleanup?.());
            effects.forEach((slot) => { slot.cleanup = slot.callback(); });
        },
    };
}

function coherent(data) {
    assert.equal(data.counts.pendingStories, data.pendingStories.length);
    assert.equal(data.counts.pendingFiles, data.pendingFiles.length);
    assert.equal(data.counts.pending, data.pendingStories.length + data.pendingFiles.length);
    assert.ok([...data.pendingStories, ...data.pendingFiles].every((row) => row.visibility === 'community' && row.moderation_status === 'pending'));
}
async function ready(h) { h.render(); await h.settle(); coherent(h.render().data); }
let checks = 0;
async function test(label, run) {
    const h = harness();
    try { await run(h); checks++; console.log(`PASS: ${label}`); }
    finally { h.dispose(); }
}

await test('initial dashboard includes pending records older than the latest 50, with matching counts', async (h) => {
    await ready(h);
    const view = h.render();
    assert.equal(view.data.stories.length, 50);
    assert.ok(!view.data.stories.some((row) => row.id === 'story-A'));
    assert.equal(view.pendingStories.length, 2);
    assert.equal(view.data.counts.stories, 62);
    assert.equal(view.data.counts.pending, 4);
    assert.equal(view.loading, false);
    assert.equal(view.error, '');
    assert.ok(h.calls.queries.every((query) => query.signal === h.calls.dashboards[0].signal), 'All dashboard queries receive the cycle signal');
});

await test('pending pagination handles server row caps and batches beyond 500', async (h) => {
    const template = h.db.stories.at(-1);
    h.db.stories = Array.from({ length: 1103 }, (_, i) => ({ ...template, id: `pending-${i}` }));
    h.cap(173);
    const data = await h.snapshot(); coherent(data);
    assert.equal(data.pendingStories.length, 1103);
    assert.equal(new Set(data.pendingStories.map((row) => row.id)).size, 1103);
    assert.equal(data.counts.stories, 1103);
});

for (const kind of ['story', 'file']) {
    for (const action of ['approved', 'rejected', 'delete']) {
        await test(`${kind} ${action} refreshes queue and counts together`, async (h) => {
            await ready(h);
            const before = h.render().data;
            const fn = kind === 'story'
                ? () => action === 'delete' ? h.services.adminDeleteStory('story-A') : h.services.moderateStory('story-A', action)
                : () => action === 'delete' ? h.services.adminDeleteFile(h.db.user_files[0]) : h.services.moderateFile('file-A', action);
            await h.action(fn);
            const view = h.render(); coherent(view.data);
            assert.notEqual(view.data, before);
            assert.equal(view.data.counts.pending, 3);
            assert.equal(view.data.counts[kind === 'story' ? 'stories' : 'files'], before.counts[kind === 'story' ? 'stories' : 'files'] - (action === 'delete' ? 1 : 0));
            assert.equal(view.error, ''); assert.equal(view.message, 'success');
            assert.equal(view.busyKey, ''); assert.equal(view.loading, false);
        });
    }
}

await test('failed mutation preserves prior queues/counts and shows the current error', async (h) => {
    await ready(h); const before = h.render().data;
    h.outcomes.mutation.push(new Error('Denied'));
    await h.action(() => h.services.moderateStory('story-A', 'approved'));
    assert.equal(h.render().data, before);
    assert.equal(h.render().error, 'actionError');
    assert.equal(h.render().message, ''); assert.equal(h.render().busyKey, '');
    assert.equal(h.calls.dashboards.length, 1);
});

for (const fails of [false, true]) {
    await test(`obsolete refresh ${fails ? 'failure' : 'success'} cannot overwrite newer moderation state`, async (h) => {
        await ready(h); const snapshot = clone(h.render().data);
        const old = deferred(); h.outcomes.dashboard.push(old.promise);
        const pending = h.refresh();
        await h.action(() => h.services.moderateStory('story-A', 'approved'));
        const latest = h.render().data;
        if (fails) old.reject(new Error('Old failure')); else old.resolve(snapshot);
        await pending;
        assert.equal(h.render().data, latest); coherent(latest);
        assert.equal(latest.counts.pending, 3); assert.equal(h.render().error, '');
    });
}

await test('old completion cannot finish newer loading or replace a newer current error', async (h) => {
    await ready(h); const snapshot = h.render().data;
    const old = deferred(); const next = deferred();
    h.outcomes.dashboard.push(old.promise, next.promise);
    const first = h.refresh(); const second = h.refresh();
    old.resolve(snapshot); await first;
    assert.equal(h.render().loading, true);
    next.reject(new Error('Current failure')); await second;
    assert.equal(h.render().loading, false); assert.equal(h.render().error, 'loadError');
});

await test('successful mutation plus failed refresh retains last snapshot and recovers through read-only retry', async (h) => {
    await ready(h); const before = h.render().data;
    h.outcomes.dashboard.push(new Error('Refresh failed'));
    await h.action(() => h.services.moderateStory('story-A', 'approved'));
    assert.equal(h.render().data, before);
    assert.equal(h.render().error, 'loadError'); assert.equal(h.render().message, '');
    assert.equal(h.render().loading, false); assert.equal(h.render().busyKey, '');
    const writes = h.calls.writes.length;
    await h.refresh();
    coherent(h.render().data); assert.equal(h.render().data.counts.pending, 3);
    assert.equal(h.render().error, ''); assert.equal(h.calls.writes.length, writes);
    assert.match(page, /if \(error === 'loadError'\) refreshDashboard\(\)/, 'Existing navigation provides read-only recovery');
});

await test('same-tick and in-flight moderation attempts are serialized; next accepted action refreshes again', async (h) => {
    await ready(h);
    const mutation = deferred(); h.outcomes.mutation.push(mutation.promise);
    const handler = h.render().runAction;
    const first = handler('first', 'success', () => h.services.moderateStory('story-A', 'approved'));
    await handler('second', 'success', () => h.services.moderateStory('story-B', 'rejected'));
    await h.settle(); assert.equal(h.calls.writes.length, 1);
    const refresh = deferred(); const snapshot = await h.snapshot(); h.outcomes.dashboard.push(refresh.promise);
    mutation.resolve(); await h.settle();
    await h.action(() => h.services.moderateStory('story-B', 'rejected'));
    assert.equal(h.calls.writes.length, 1); assert.equal(h.render().busyKey, 'first');
    snapshot.pendingStories = snapshot.pendingStories.filter((row) => row.id !== 'story-A');
    snapshot.counts.pendingStories--; snapshot.counts.pending--;
    refresh.resolve(snapshot); await first;
    await h.action(() => h.services.moderateStory('story-B', 'rejected'));
    assert.equal(h.calls.writes.length, 2); coherent(h.render().data);
    assert.equal(h.render().data.counts.pendingStories, 0);
});

for (const context of [{ user: { id: 'other-admin' } }, { isAdmin: false }, { accountStatus: 'inactive' }]) {
    for (const fails of [false, true]) {
        await test(`context ${JSON.stringify(context)} blocks old refresh ${fails ? 'failure' : 'success'}`, async (h) => {
            await ready(h); const snapshot = h.render().data;
            const pending = deferred(); h.outcomes.dashboard.push(pending.promise);
            const first = h.refresh(); h.context(context); await h.settle();
            const current = h.render().data;
            if (fails) pending.reject(new Error('Old context failure')); else pending.resolve(snapshot);
            await first;
            assert.equal(h.render().data, current); assert.equal(h.render().error, '');
            assert.equal(h.instances[0].lateUpdates, 0);
        });
    }
}

for (const fails of [false, true]) {
    await test(`unmount blocks old action ${fails ? 'failure' : 'success'} and stops its refresh`, async (h) => {
        await ready(h);
        const late = deferred();
        const pending = h.action(() => late.promise);
        h.dispose();
        if (fails) late.reject(new Error('Late mutation failure')); else late.resolve();
        await pending;
        assert.equal(h.calls.dashboards.length, 1); assert.equal(h.instances[0].lateUpdates, 0);
    });
}

await test('language rerender does not start a competing load or clear active moderation', async (h) => {
    await ready(h); const pending = deferred();
    const action = h.action(() => pending.promise);
    h.language('bg'); assert.equal(h.calls.dashboards.length, 1);
    assert.equal(h.render().busyKey, 'action');
    pending.resolve(); await action; coherent(h.render().data);
});

await test('Strict Mode initial read and member details cannot update an obsolete scope', async (h) => {
    const old = deferred(); h.outcomes.dashboard.push(old.promise);
    h.render(); h.replayEffects(); await h.settle();
    const current = h.render().data;
    old.reject(new Error('Old initial failure')); await h.settle();
    assert.equal(h.render().data, current); assert.equal(h.render().error, '');
    const details = deferred(); h.outcomes.details.push(details.promise);
    const pending = h.render().openMemberDetails({ id: 'member' });
    h.context({ user: { id: 'other-admin' } }); await h.settle();
    details.resolve({ display_name: 'Old details' }); await pending;
    assert.equal(h.render().memberDetails, null); assert.equal(h.instances[0].lateUpdates, 0);
});

await test('failed constituent query rejects the whole dashboard; permissions and moderation validations stay intact', async (h) => {
    h.outcomes.query.push(new Error('Count failed'));
    await assert.rejects(h.snapshot(), /Count failed/);
    await assert.rejects(h.services.moderateStory('story-A', 'pending'), /Unsupported/);
    await assert.rejects(h.services.moderateFile('file-A', 'unknown'), /Unsupported/);
    await assert.rejects(h.services.setMemberAccountStatus('admin', 'inactive'), /cannot be deactivated/);
    assert.equal(h.calls.writes.length, 0);
    const guard = read('src/routing/RequireAdmin.jsx');
    assert.match(guard, /if \(loading \|\| roleLoading\)/);
    assert.match(guard, /if \(!user \|\| !isAdmin\)/);
    assert.match(guard, /<Navigate to="\/" replace \/>/);
});

console.log(`${checks} mocked checks using actual component and admin services; no network requests.`);
console.log('ADMIN QUEUE CONSISTENCY 01: PASS');
