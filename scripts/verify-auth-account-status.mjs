import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const providerPath = new URL('../src/context/AuthProvider.jsx', import.meta.url);
const guardPath = new URL('../src/routing/RequireAuth.jsx', import.meta.url);
const providerSource = readFileSync(providerPath, 'utf8');
const guardSource = readFileSync(guardPath, 'utf8');

assert.match(providerSource, /useState\(null\).*accountStatus|\[accountStatus, setAccountStatus\] = useState\(null\)/s,
    'Account status must start unknown, not active');
assert.match(providerSource, /setAccountStatus\(data\?\.account_status \?\? null\)/,
    'Missing role rows must keep account status unknown');
assert.match(providerSource, /if \(error\)[\s\S]*setAccountStatus\(null\)/,
    'Role read errors must fail closed');
assert.match(providerSource, /isActive:\s*accountStatus === 'active'/,
    'Only explicit active status may set isActive');
assert.match(guardSource, /loading \|\| roleLoading/,
    'Authenticated routes must wait for account status resolution');
assert.match(guardSource, /if \(!isActive\)[\s\S]*Navigate to="\/"/,
    'Inactive or unknown accounts must not enter private member routes');

const executableSource = providerSource
    .replace(/^import .+;\r?\n/gm, '')
    .replace(
        /return \(\s*<AuthContext\.Provider value=\{value\}>\s*\{children\}\s*<\/AuthContext\.Provider>\s*\);/,
        'return value;',
    )
    .replace(/export default AuthProvider;\s*$/, '');

function deferred() {
    let resolve;
    const promise = new Promise((complete) => { resolve = complete; });
    return { promise, resolve };
}

function createHarness() {
    const state = [];
    const requests = [];
    const restorations = [];
    const listeners = [];
    let hookIndex = 0;
    let effect;
    let cleanup;

    const supabase = {
        auth: {
            getSession() {
                const request = deferred();
                restorations.push(request);
                return request.promise;
            },
            onAuthStateChange(callback) {
                const listener = { callback, unsubscribed: false };
                listeners.push(listener);
                return {
                    data: {
                        subscription: {
                            unsubscribe() { listener.unsubscribed = true; },
                        },
                    },
                };
            },
        },
        from(table) {
            assert.equal(table, 'user_roles');
            let userId;
            return {
                select(columns) {
                    assert.equal(columns, 'role,account_status');
                    return this;
                },
                eq(column, value) {
                    assert.equal(column, 'user_id');
                    userId = value;
                    return this;
                },
                maybeSingle() {
                    const request = { userId, ...deferred() };
                    requests.push(request);
                    return request.promise;
                },
            };
        },
    };

    const Provider = runInNewContext(`${executableSource}\nAuthProvider;`, {
        supabase,
        console: { error() {} },
        useState(initial) {
            const index = hookIndex++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => { state[index] = value; }];
        },
        useEffect(callback) {
            effect = callback;
        },
    });

    function render() {
        hookIndex = 0;
        return Provider({ children: null });
    }

    render();
    cleanup = effect();

    return {
        requests,
        restorations,
        listeners,
        snapshot: render,
        async restore(userId) {
            restorations[0].resolve({
                data: { session: userId ? { user: { id: userId } } : null },
                error: null,
            });
            await setImmediate();
        },
        async settle(data, error = null, index = 0) {
            requests[index].resolve({ data, error });
            await setImmediate();
        },
        emit(userId) {
            listeners[0].callback(
                userId ? 'SIGNED_IN' : 'SIGNED_OUT',
                userId ? { user: { id: userId } } : null,
            );
        },
        dispose() { cleanup(); },
    };
}

async function withHarness(check) {
    const harness = createHarness();
    try {
        await check(harness);
    } finally {
        harness.dispose();
    }
}

await withHarness(async (h) => {
    await h.restore('active-user');
    assert.equal(h.snapshot().isActive, false, 'Pending status must not be active');
    assert.equal(h.snapshot().roleLoading, true);
    await h.settle({ role: 'user', account_status: 'active' });
    assert.equal(h.snapshot().isActive, true, 'Explicit active status must allow member access');
});

await withHarness(async (h) => {
    await h.restore('missing-row-user');
    await h.settle(null);
    assert.equal(h.snapshot().accountStatus, null, 'Missing user_roles row must stay unknown');
    assert.equal(h.snapshot().isActive, false, 'Missing user_roles row must fail closed');
    assert.equal(h.snapshot().roleLoading, false);
});

await withHarness(async (h) => {
    await h.restore('error-user');
    await h.settle(null, { message: 'temporary role read failure' });
    assert.equal(h.snapshot().accountStatus, null, 'Role read errors must stay unknown');
    assert.equal(h.snapshot().isActive, false, 'Role read errors must fail closed');
});

await withHarness(async (h) => {
    await h.restore('inactive-user');
    await h.settle({ role: 'user', account_status: 'inactive' });
    assert.equal(h.snapshot().isActive, false, 'Inactive status must remain blocked');
});

await withHarness(async (h) => {
    await h.restore('A');
    h.emit('B');
    await h.settle({ role: 'user', account_status: 'active' }, null, 1);
    assert.equal(h.snapshot().user.id, 'B');
    assert.equal(h.snapshot().isActive, true);
    await h.settle({ role: 'admin', account_status: 'active' }, null, 0);
    assert.equal(h.snapshot().user.id, 'B', 'Late A response must not replace current user');
    assert.equal(h.snapshot().role, 'user', 'Late A response must not replace current role');
});

await withHarness(async (h) => {
    await h.restore('A');
    h.emit(null);
    await h.settle({ role: 'admin', account_status: 'active' });
    assert.equal(h.snapshot().user, null, 'Logout must invalidate late role responses');
    assert.equal(h.snapshot().accountStatus, null);
    assert.equal(h.snapshot().isActive, false);
});

console.log('PASS: FIX 19 fail-closed account status loading');
