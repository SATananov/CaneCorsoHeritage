import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const componentSource = readFileSync(
    new URL('../src/components/ProfileCompletionNotice.jsx', import.meta.url),
    'utf8',
);

assert.match(
    componentSource,
    /if \(loading \|\| roleLoading \|\| !user\?\.id \|\| !isActive\) \{\s*return null;\s*\}/,
    'Outer notice guard must fail closed while auth/account state is unresolved or inactive',
);
assert.match(
    componentSource,
    /<ActiveProfileCompletionNotice key=\{user\.id\} userId=\{user\.id\} \/>/,
    'Active notice must be keyed by user so user changes remount private state',
);
assert.doesNotMatch(
    componentSource,
    /if \(loading \|\| roleLoading \|\| !user\?\.id \|\| !isActive\)[\s\S]{0,300}setCompletionState/,
    'Fail-closed gating must not synchronously clear component state inside an effect',
);

const activeStart = componentSource.indexOf('function ActiveProfileCompletionNotice');
const renderGuard = componentSource.indexOf('\n    if (!completionState.loaded', activeStart);
assert.ok(activeStart >= 0 && renderGuard > activeStart, 'Active notice logic must be locatable before JSX render');

const requiredStart = componentSource.indexOf('const requiredFieldKeys');
const requiredEnd = componentSource.indexOf('\n\nfunction ActiveProfileCompletionNotice', requiredStart);
assert.ok(requiredStart >= 0 && requiredEnd > requiredStart, 'Required profile fields must be locatable');

const activeSource = `${componentSource.slice(requiredStart, requiredEnd)}\n\n${componentSource.slice(activeStart, renderGuard)}
    return { completionState, missingFields };
}
ActiveProfileCompletionNotice;`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function sameDependencies(previous, next) {
    return previous?.length === next.length
        && next.every((value, index) => Object.is(value, previous[index]));
}

function mountActive(userId, dependencies) {
    const hooks = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];

    const memo = (factory, deps) => {
        const index = cursor++;
        if (!sameDependencies(hooks[index]?.deps, deps)) {
            hooks[index] = { deps, value: factory() };
        }
        return hooks[index].value;
    };

    const Component = runInNewContext(activeSource, {
        ...dependencies,
        useState(initial) {
            const index = cursor++;
            hooks[index] ??= {
                value: typeof initial === 'function' ? initial() : initial,
            };
            return [hooks[index].value, (next) => {
                const value = typeof next === 'function'
                    ? next(hooks[index].value)
                    : next;
                if (!Object.is(value, hooks[index].value)) {
                    hooks[index].value = value;
                    dirty = true;
                }
            }];
        },
        useMemo: memo,
        useCallback: (callback, deps) => memo(() => callback, deps),
        useEffect(callback, deps) {
            const index = cursor++;
            if (!sameDependencies(hooks[index]?.deps, deps)) {
                const previous = hooks[index];
                hooks[index] = { deps };
                effects.push(() => {
                    previous?.cleanup?.();
                    hooks[index].cleanup = callback();
                });
            }
        },
    });

    return {
        render() {
            let view;
            let attempts = 0;
            do {
                assert.ok(++attempts < 20, 'ActiveProfileCompletionNotice must stabilize');
                cursor = 0;
                dirty = false;
                view = Component({ userId });
                const pending = effects;
                effects = [];
                pending.forEach((effect) => effect());
            } while (dirty);
            return view;
        },
        dispose() {
            hooks.forEach((hook) => hook.cleanup?.());
        },
    };
}

function harness(initialAuth) {
    let auth = { ...initialAuth };
    let mounted = null;
    let mountedUserId = null;
    const requests = [];
    const subscriptions = [];
    const warnings = [];

    const dependencies = {
        AbortController,
        console: { warn: (...args) => warnings.push(args) },
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        fetchOwnPrivateProfileDetails(userId, { signal }) {
            const request = { userId, signal, ...deferred() };
            requests.push(request);
            return request.promise;
        },
        subscribeProfileRefresh(userId, listener) {
            const subscription = { userId, listener, active: true };
            subscriptions.push(subscription);
            return () => {
                subscription.active = false;
            };
        },
    };

    function eligible() {
        return !auth.loading && !auth.roleLoading && Boolean(auth.user?.id) && auth.isActive;
    }

    function render() {
        if (!eligible()) {
            mounted?.dispose();
            mounted = null;
            mountedUserId = null;
            return null;
        }

        if (!mounted || mountedUserId !== auth.user.id) {
            mounted?.dispose();
            mountedUserId = auth.user.id;
            mounted = mountActive(mountedUserId, dependencies);
        }

        return mounted.render();
    }

    return {
        requests,
        subscriptions,
        warnings,
        render,
        setAuth(next) {
            auth = { ...auth, ...next };
            return render();
        },
        async resolve(index, details) {
            assert.ok(requests[index], `request ${index} exists`);
            requests[index].resolve(details);
            await setImmediate();
            return render();
        },
        activeSubscriptions() {
            return subscriptions.filter((subscription) => subscription.active);
        },
        dispose() {
            mounted?.dispose();
        },
    };
}

const activeAuth = {
    user: { id: 'A' },
    loading: false,
    roleLoading: false,
    isActive: true,
};

for (const [label, auth] of [
    ['guest', { user: null, loading: false, roleLoading: false, isActive: false }],
    ['auth loading', { user: { id: 'A' }, loading: true, roleLoading: false, isActive: false }],
    ['role loading', { user: { id: 'A' }, loading: false, roleLoading: true, isActive: false }],
    ['inactive account', { user: { id: 'A' }, loading: false, roleLoading: false, isActive: false }],
]) {
    const h = harness(auth);
    assert.equal(h.render(), null);
    assert.equal(h.requests.length, 0, `${label} must not start a private profile read`);
    assert.equal(h.activeSubscriptions().length, 0, `${label} must not subscribe to profile refresh`);
    h.dispose();
    console.log(`PASS: ${label} does not access private profile completion data`);
}

{
    const h = harness(activeAuth);
    h.render();
    assert.equal(h.requests.length, 1, 'active account starts one private profile read');
    assert.equal(h.activeSubscriptions().length, 1, 'active account subscribes once');
    await h.resolve(0, { first_name: '', last_name: 'Member', country: 'BG', city: 'Sofia' });
    assert.equal(h.render().completionState.loaded, true);
    h.dispose();
    console.log('PASS: active account loads and subscribes to private profile completion data');
}

{
    const h = harness(activeAuth);
    h.render();
    const pending = h.requests[0];
    h.setAuth({ isActive: false });
    assert.equal(pending.signal.aborted, true, 'active to inactive aborts pending private read');
    assert.equal(h.activeSubscriptions().length, 0, 'active to inactive unsubscribes refresh listener');
    pending.resolve({ first_name: 'Late A' });
    await setImmediate();
    assert.equal(h.render(), null, 'inactive account cannot surface late private data');
    h.dispose();
    console.log('PASS: active to inactive aborts and hides private completion state');
}

{
    const h = harness(activeAuth);
    h.render();
    await h.resolve(0, { first_name: 'Loaded A' });
    h.setAuth({ isActive: false });
    const remounted = h.setAuth({ isActive: true });
    assert.equal(h.requests.length, 2, 'inactive to active performs a fresh private read');
    assert.equal(remounted.completionState.loaded, false, 'reactivation starts with fresh private state');
    h.dispose();
    console.log('PASS: inactive to active remounts with fresh private completion state');
}

{
    const h = harness(activeAuth);
    h.render();
    const requestA = h.requests[0];
    h.setAuth({ user: { id: 'B' } });
    assert.equal(requestA.signal.aborted, true, 'user A request is aborted on user switch');
    assert.equal(h.requests[1].userId, 'B');
    requestA.resolve({ first_name: 'Late A' });
    await setImmediate();
    assert.equal(h.render().completionState.loaded, false, 'late A result cannot populate B state');
    await h.resolve(1, { first_name: 'Member B' });
    assert.equal(h.render().completionState.details.first_name, 'Member B');
    h.dispose();
    console.log('PASS: user switch remounts state and rejects late private data');
}

console.log('PROFILE COMPLETION ACCESS GATING 01: PASS');
