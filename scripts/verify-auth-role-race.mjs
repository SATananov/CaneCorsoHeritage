import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
    new URL('../src/context/AuthProvider.jsx', import.meta.url),
    'utf8',
);

// Run the real provider with mocked hooks/SDK. Only replace imports and its
// JSX wrapper so Node can inspect the unchanged context value without a DOM.
const providerSource = source
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

function sessionFor(userId) {
    return userId ? { user: { id: userId } } : null;
}

function createHarness() {
    const state = [];
    const requests = [];
    const restorations = [];
    const listeners = [];
    const errors = [];
    let hookIndex = 0;
    let writes = 0;
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

    const Provider = runInNewContext(`${providerSource}\nAuthProvider;`, {
        supabase,
        console: { error: (...args) => errors.push(args) },
        useState(initial) {
            const index = hookIndex++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => { state[index] = value; writes++; }];
        },
        useEffect(callback, dependencies) {
            assert.equal(dependencies.length, 0);
            effect = callback;
        },
    });

    function render() {
        hookIndex = 0;
        return Provider({ children: null });
    }

    function snapshot() {
        const value = render();
        return {
            userId: value.user?.id ?? null,
            loading: value.loading,
            role: value.role,
            accountStatus: value.accountStatus,
            roleLoading: value.roleLoading,
            isAdmin: value.isAdmin,
            isActive: value.isActive,
        };
    }

    render();
    cleanup = effect();

    return {
        requests,
        restorations,
        listeners,
        errors,
        render,
        snapshot,
        writeCount: () => writes,
        async restore(userId, index = 0) {
            restorations[index].resolve({ data: { session: sessionFor(userId) }, error: null });
            await setImmediate();
        },
        emit(userId, event = userId ? 'SIGNED_IN' : 'SIGNED_OUT') {
            listeners.at(-1).callback(event, sessionFor(userId));
        },
        async settle(index, role, accountStatus, error = null) {
            assert.ok(requests[index], `Missing role request ${index}`);
            requests[index].resolve({
                data: error ? null : { role, account_status: accountStatus },
                error,
            });
            await setImmediate();
        },
        dispose() { cleanup(); },
        restartEffect() {
            cleanup();
            render();
            cleanup = effect();
        },
    };
}

function expected(userId, role = 'user', accountStatus = null, roleLoading = false) {
    return {
        userId,
        loading: false,
        role,
        accountStatus,
        roleLoading,
        isAdmin: role === 'admin',
        isActive: accountStatus === 'active',
    };
}

async function test(label, check) {
    const harness = createHarness();
    try {
        await check(harness);
        console.log(`PASS: ${label}`);
    } finally {
        harness.dispose();
    }
}

await test('normal A load and unchanged AuthContext API', async (h) => {
    assert.deepEqual(Object.keys(h.render()).sort(), [
        'session', 'user', 'loading', 'role', 'accountStatus', 'roleLoading',
        'passwordRecovery', 'isAdmin', 'isActive', 'login', 'register', 'requestPasswordReset',
        'updatePassword', 'logout',
    ].sort());
    await h.restore('A');
    assert.deepEqual(h.snapshot(), expected('A', 'user', null, true));
    await h.settle(0, 'admin', 'inactive');
    assert.deepEqual(h.snapshot(), expected('A', 'admin', 'inactive'));
});

await test('logout before A resolves ignores its late success', async (h) => {
    await h.restore('A');
    h.emit(null);
    assert.deepEqual(h.snapshot(), expected(null));
    const writes = h.writeCount();
    await h.settle(0, 'admin', 'inactive');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected(null));
});

await test('A to B: B resolves first, late A cannot overwrite B', async (h) => {
    await h.restore('A');
    h.emit('B');
    assert.deepEqual(h.requests.map((request) => request.userId), ['A', 'B']);
    await h.settle(1, 'user', 'inactive');
    const writes = h.writeCount();
    await h.settle(0, 'admin', 'active');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected('B', 'user', 'inactive'));
});

await test('reverse completion: stale A cannot finish loading while B is pending', async (h) => {
    await h.restore('A');
    h.emit('B');
    const before = h.snapshot();
    const writes = h.writeCount();
    await h.settle(0, 'admin', 'inactive');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), before);
    assert.equal(h.snapshot().roleLoading, true);
    await h.settle(1, 'user', 'inactive');
    assert.deepEqual(h.snapshot(), expected('B', 'user', 'inactive'));
});

await test('stale A error after B succeeds cannot apply fallback state', async (h) => {
    await h.restore('A');
    h.emit('B');
    await h.settle(1, 'admin', 'inactive');
    const writes = h.writeCount();
    await h.settle(0, null, null, { message: 'Late A error' });
    assert.equal(h.writeCount(), writes);
    assert.equal(h.errors.length, 0);
    assert.deepEqual(h.snapshot(), expected('B', 'admin', 'inactive'));
});

await test('stale error cannot finish loading for a newer request for the same user', async (h) => {
    await h.restore('A');
    h.emit('A');
    const writes = h.writeCount();
    await h.settle(0, null, null, { message: 'Old request failed' });
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected('A', 'user', null, true));
    await h.settle(1, 'admin', 'active');
    assert.deepEqual(h.snapshot(), expected('A', 'admin', 'active'));
});

await test('current request error fails closed and finishes loading', async (h) => {
    await h.restore('A');
    await h.settle(0, null, null, { message: 'Current request failed' });
    assert.deepEqual(h.snapshot(), expected('A'));
    assert.equal(h.errors.length, 1);
});

await test('late initial session cannot undo a newer logout', async (h) => {
    h.emit('A');
    h.emit(null);
    const writes = h.writeCount();
    await h.restore('A');
    await h.settle(0, 'admin', 'inactive');
    assert.equal(h.writeCount(), writes);
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.snapshot(), expected(null));
});

await test('late initial session cannot undo a newer account switch', async (h) => {
    h.emit('B');
    await h.settle(0, 'user', 'inactive');
    const writes = h.writeCount();
    await h.restore('A');
    assert.equal(h.writeCount(), writes);
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.snapshot(), expected('B', 'user', 'inactive'));
});

await test('cleanup unsubscribes and blocks late requests and callbacks', async (h) => {
    await h.restore('A');
    h.dispose();
    assert.equal(h.listeners[0].unsubscribed, true);
    const writes = h.writeCount();
    await h.settle(0, 'admin', 'inactive');
    h.emit('B');
    assert.equal(h.writeCount(), writes);
    assert.equal(h.requests.length, 1);
});

await test('StrictMode-style effect restart rejects completions from the old effect', async (h) => {
    await h.restore('A');
    h.restartEffect();
    assert.equal(h.listeners[0].unsubscribed, true);
    await h.restore('B', 1);
    await h.settle(1, 'user', 'inactive');
    const writes = h.writeCount();
    await h.settle(0, 'admin', 'active');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected('B', 'user', 'inactive'));
});

await test('initial token refresh still waits for verified authorization', async (h) => {
    await h.restore('A');
    h.emit('A', 'TOKEN_REFRESHED');
    assert.deepEqual(h.snapshot(), expected('A', 'user', null, true));
    await h.settle(0, 'admin', 'active');
    assert.equal(h.snapshot().roleLoading, true);
    await h.settle(1, 'user', 'active');
    assert.deepEqual(h.snapshot(), expected('A', 'user', 'active'));
});

await test('verified same-user refresh and sign-in keep private routes mounted while rechecking', async (h) => {
    await h.restore('A');
    await h.settle(0, 'admin', 'active');
    for (const [index, event] of ['TOKEN_REFRESHED', 'SIGNED_IN'].entries()) {
        h.emit('A', event);
        assert.deepEqual(h.snapshot(), expected('A', 'admin', 'active'));
        assert.equal(h.requests.length, index + 2, 'Authorization must still be rechecked');
        await h.settle(index + 1, 'admin', 'active');
        assert.deepEqual(h.snapshot(), expected('A', 'admin', 'active'));
    }
});

for (const [role, status, error] of [
    ['admin', 'inactive', null],
    ['user', 'active', null],
    [null, null, { message: 'Authorization unavailable' }],
]) {
    await test(`background check applies revocation/demotion/error: ${role}/${status}`, async (h) => {
        await h.restore('A');
        await h.settle(0, 'admin', 'active');
        h.emit('A', 'TOKEN_REFRESHED');
        await h.settle(1, role, status, error);
        assert.deepEqual(h.snapshot(), expected('A', role ?? 'user', status));
    });
}

await test('missing background role row fails closed', async (h) => {
    await h.restore('A');
    await h.settle(0, 'admin', 'active');
    h.emit('A', 'TOKEN_REFRESHED');
    h.requests[1].resolve({ data: null, error: null });
    await setImmediate();
    assert.deepEqual(h.snapshot(), expected('A'));
    h.emit('A', 'TOKEN_REFRESHED');
    assert.equal(h.snapshot().roleLoading, true);
});

await test('A to B to A cannot reuse earlier verified authorization', async (h) => {
    await h.restore('A');
    await h.settle(0, 'admin', 'active');
    h.emit('A', 'TOKEN_REFRESHED');
    h.emit('B');
    assert.deepEqual(h.snapshot(), expected('B', 'user', null, true));
    h.emit('A');
    assert.deepEqual(h.snapshot(), expected('A', 'user', null, true));
    await h.settle(1, 'admin', 'active');
    await h.settle(2, 'admin', 'active');
    assert.equal(h.snapshot().roleLoading, true);
    await h.settle(3, 'user', 'inactive');
    assert.deepEqual(h.snapshot(), expected('A', 'user', 'inactive'));
});

await test('logout during background verification immediately clears authorization', async (h) => {
    await h.restore('A');
    await h.settle(0, 'admin', 'active');
    h.emit('A', 'TOKEN_REFRESHED');
    h.emit(null);
    await h.settle(1, 'admin', 'active');
    assert.deepEqual(h.snapshot(), expected(null));
});

console.log('AUTH ROLE RACE 01: PASS (19 mocked scenarios; no network requests)');
