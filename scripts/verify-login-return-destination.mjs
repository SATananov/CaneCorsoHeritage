import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
function guardLogic(path, name) {
    const source = read(path)
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/export default \w+;\s*$/, '')
        .replace(/return \(\s*<main[\s\S]*?<\/main>\s*\);/, "return { kind: 'loading' };")
        .replace('<Navigate to={destination} replace />', "{ kind: 'redirect', to: destination, replace: true }")
        .replace('<Navigate to="/login" replace state={{ from: location }} />',
            "{ kind: 'redirect', to: '/login', replace: true, state: { from: location } }")
        .replace('<Navigate to="/" replace />',
            "{ kind: 'redirect', to: '/', replace: true }")
        .replace('<Outlet />', "{ kind: 'outlet' }");
    assert.ok(!source.includes('<Navigate') && !source.includes('<main'), 'Replace only guard JSX');
    return `${source}\n${name};`;
}
const guestSource = guardLogic('routing/RequireGuest.jsx', 'RequireGuest');
const authSource = guardLogic('routing/RequireAuth.jsx', 'RequireAuth');
const form = read('components/AuthPreparationSection.jsx');
const formStart = form.indexOf('function AuthPreparationSection(');
const formEnd = form.search(/\n    return \(\r?\n        <section/);
assert.ok(formStart >= 0 && formEnd > formStart);
const formSource = `${form.slice(formStart, formEnd)}
    return { handleSubmit, handleChange, submitting, errorMessage, successMessage };
}
AuthPreparationSection;`;

// Run actual handlers and guards, replacing only presentation with descriptors.
// Mock services never import the Supabase client or perform network requests.
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function mount(source, dependencies, props = {}) {
    const hooks = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];
    let writes = 0;
    const Component = runInNewContext(source, {
        ...dependencies,
        useState(initial) {
            const index = cursor++;
            hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [hooks[index].value, (next) => {
                writes++;
                const value = typeof next === 'function' ? next(hooks[index].value) : next;
                if (!Object.is(value, hooks[index].value)) {
                    hooks[index].value = value;
                    dirty = true;
                }
            }];
        },
        useEffect(callback, deps) {
            const index = cursor++;
            const previous = hooks[index];
            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                const slot = { deps };
                hooks[index] = slot;
                effects.push(() => {
                    previous?.cleanup?.();
                    slot.cleanup = callback();
                });
            }
        },
    });
    return {
        render() {
            let view;
            let attempts = 0;
            do {
                assert.ok(++attempts < 20, 'No render loop');
                cursor = 0;
                dirty = false;
                view = Component(props);
                if (!dirty) {
                    const pending = effects;
                    effects = [];
                    pending.forEach((effect) => effect());
                }
            } while (dirty);
            return view;
        },
        writes: () => writes,
        dispose() { hooks.forEach((slot) => slot.cleanup?.()); },
    };
}

const complete = { first_name: 'First', last_name: 'Last', country: 'Bulgaria', city: 'Sofia' };
const target = { pathname: '/my-stories', search: '?page=2', hash: '#drafts' };
const expectedTarget = '/my-stories?page=2#drafts';

function harness({ from = target, mode = 'login', authenticated = false } = {}) {
    let user = authenticated ? { id: 'A' } : null;
    let loading = false;
    let location = { pathname: `/${mode}`, state: { from } };
    let language = 'en';
    let guardMounted = true;
    const profileRequests = [];
    const authRequests = [];
    const navigation = [];
    const warnings = [];
    const authCall = (operation) => (...args) => {
        const request = { operation, args, ...deferred() };
        authRequests.push(request);
        return request.promise;
    };
    const dependencies = {
        AbortController, URL,
        console: { warn: (...args) => warnings.push(args) },
        useAuth: () => ({
            user, loading, roleLoading: false, roleError: false, isActive: true,
            login: authCall('login'), register: authCall('register'),
        }),
        useLanguage: () => ({ language }),
        getTranslation: (_language, _section, key) => key,
        useLocation: () => location,
        useNavigate: () => (to, options) => navigation.push({ owner: 'form', to, ...options }),
        fetchOwnPrivateProfileDetails(id, { signal } = {}) {
            const request = { id, signal, ...deferred() };
            profileRequests.push(request);
            // Deliberately ignore abort to exercise stale response protection.
            return request.promise;
        },
    };
    const guest = mount(guestSource, dependencies);
    const formInstance = mount(formSource, dependencies, { mode });
    const auth = runInNewContext(authSource, dependencies);
    guest.render();
    const change = (name, value) => formInstance.render().handleChange({ target: { name, value } });
    change('email', 'member@example.test');
    change('password', 'secret123');
    change('displayName', 'Member A');
    change('username', 'member.a');
    return {
        guest, form: formInstance, profileRequests, authRequests, navigation, warnings,
        submit: () => formInstance.render().handleSubmit({ preventDefault() {} }),
        setUser(id) { user = id ? { id } : null; return guest.render(); },
        setLoading(value) { loading = value; return guest.render(); },
        setLanguage(value) { language = value; return guest.render(); },
        setFrom(value) { location = { ...location, state: { from: value } }; return guest.render(); },
        protectedRoute() {
            location = { ...target, state: null, key: 'protected' };
            const redirect = auth();
            assert.equal(redirect.to, '/login');
            assert.equal(redirect.replace, true);
            assert.equal(redirect.state.from, location);
            location = { pathname: redirect.to, state: redirect.state };
            return redirect;
        },
        async profile(index, details = complete) {
            profileRequests[index].resolve(details);
            await setImmediate();
        },
        async profileError(index) {
            profileRequests[index].reject(new Error('Profile unavailable'));
            await setImmediate();
        },
        commitRedirect() {
            assert.equal(guardMounted, true, 'One mounted navigation owner');
            const view = guest.render();
            assert.equal(view.kind, 'redirect');
            navigation.push({ owner: 'guard', to: view.to, replace: view.replace });
            // A committed Navigate leaves the guest route and unmounts its form.
            guest.dispose(); formInstance.dispose(); guardMounted = false;
            return view.to;
        },
        dispose() { guest.dispose(); formInstance.dispose(); },
    };
}

async function test(label, run, options) {
    const h = harness(options);
    try { await run(h); console.log(`PASS: ${label}`); }
    finally { h.dispose(); }
}

await test('protected route preserves pathname, query and fragment through login', async (h) => {
    h.protectedRoute();
    const submit = h.submit();
    h.authRequests[0].resolve({ user: { id: 'A' } });
    await submit;
    assert.equal(h.navigation.length, 0);
    assert.equal(h.setUser('A').kind, 'loading');
    await h.profile(0);
    assert.equal(h.commitRedirect(), expectedTarget);
    assert.equal(h.navigation.length, 1);
    assert.equal(h.navigation[0].replace, true);
});

await test('early auth event and fast profile check cannot compete with late login completion', async (h) => {
    const submit = h.submit();
    h.setUser('A');
    await h.profile(0);
    assert.equal(h.commitRedirect(), expectedTarget);
    h.authRequests[0].resolve({ user: { id: 'A' } });
    await submit;
    assert.equal(h.navigation.length, 1);
    assert.equal(h.navigation[0].owner, 'guard');
    assert.equal(h.profileRequests.length, 1);
});

for (const details of [null, {}, { ...complete, city: '   ' }]) {
    await test('incomplete profile takes precedence over the return destination', async (h) => {
        h.setUser('A');
        await h.profile(0, details);
        assert.equal(h.commitRedirect(), '/users/A');
    });
}

await test('profile-check failure does not masquerade as an incomplete profile', async (h) => {
    h.setUser('A');
    await h.profileError(0);
    assert.equal(h.guest.render().kind, 'loading');
    assert.equal(h.navigation.length, 0);
});

await test('direct login without destination falls back to home', async (h) => {
    h.setFrom(undefined);
    h.setUser('A');
    await h.profile(0);
    assert.equal(h.commitRedirect(), '/');
});

await test('already-authenticated complete member honors the return destination', async (h) => {
    assert.equal(h.guest.render().kind, 'loading');
    await h.profile(0);
    assert.equal(h.commitRedirect(), expectedTarget);
    assert.equal(h.authRequests.length, 0);
}, { authenticated: true });

await test('already-authenticated direct login keeps the home default', async (h) => {
    h.setFrom(null);
    await h.profile(0);
    assert.equal(h.commitRedirect(), '/');
}, { authenticated: true });

await test('internal string destination is supported', async (h) => {
    h.setUser('A');
    await h.profile(0);
    assert.equal(h.commitRedirect(), '/my-files?type=audio#recent');
}, { from: '/my-files?type=audio#recent' });

await test('encoded spaces in internal query values are preserved', async (h) => {
    h.setUser('A');
    await h.profile(0);
    assert.equal(h.commitRedirect(), '/my-stories?search=great%20dog');
}, { from: '/my-stories?search=great%20dog' });

await test('external, malformed and guest-only destinations are rejected', async (h) => {
    h.setUser('A');
    await h.profile(0);
    const invalid = [
        'https://evil.test', '//evil.test', '/\\evil.test', '\\evil.test',
        'javascript:alert(1)', 'my-stories', '/%2f%2fevil.test', '/%5cevil.test',
        '/.//evil.test', '/bad%ZZ', '/bad\npath', '/%0apath', '', 7, [], {},
        { pathname: {} }, { pathname: '//evil.test' },
        { pathname: '/my-files', search: {} }, { pathname: '/my-files', hash: [] },
        { pathname: '/my-files', search: 'https://evil.test' },
        { pathname: '/my-files', hash: 'fragment' },
        { pathname: '/my-files?bad=path' }, '/login', '/REGISTER/', '/%6cogin',
        '/my-files/../login?retry=1',
    ];
    for (const from of invalid) {
        assert.equal(h.setFrom(from).to, '/', JSON.stringify(from));
    }
    assert.equal(h.profileRequests.length, 1, 'Destination changes do not repeat profile reads');
});

await test('rerenders and language changes do not repeat the profile check', async (h) => {
    h.setUser('A');
    for (const language of ['bg', 'it', 'en']) h.setLanguage(language);
    await h.profile(0);
    for (let i = 0; i < 5; i++) assert.equal(h.guest.render().to, expectedTarget);
    assert.equal(h.profileRequests.length, 1);
    assert.equal(h.navigation.length, 0, 'Form has no imperative redirect');
    h.commitRedirect();
    assert.equal(h.navigation.length, 1);
});

await test('auth restoration waits before deciding or reading the profile', async (h) => {
    h.setLoading(true);
    assert.equal(h.setUser('A').kind, 'loading');
    assert.equal(h.profileRequests.length, 0);
    h.setLoading(false);
    assert.equal(h.profileRequests.length, 1);
    await h.profile(0);
    assert.equal(h.commitRedirect(), expectedTarget);
});

await test('failed login stays on form without a profile check or navigation', async (h) => {
    const submit = h.submit();
    h.authRequests[0].reject(new Error('Invalid login credentials'));
    await submit;
    assert.equal(h.form.render().errorMessage, 'badCredentials');
    assert.equal(h.form.render().submitting, false);
    assert.equal(h.guest.render().kind, 'outlet');
    assert.equal(h.profileRequests.length, 0);
    assert.equal(h.navigation.length, 0);
});

await test('unresolved login result does not navigate', async (h) => {
    const submit = h.submit();
    h.authRequests[0].resolve({});
    await submit;
    assert.equal(h.form.render().errorMessage, 'unableContinue');
    assert.equal(h.navigation.length, 0);
});

await test('session registration has one owner and still enters profile setup', async (h) => {
    const submit = h.submit();
    h.setUser('A');
    await h.profile(0, null);
    assert.equal(h.commitRedirect(), '/users/A');
    h.authRequests[0].resolve({ session: { user: { id: 'A' } } });
    await submit;
    assert.equal(h.navigation.length, 1);
}, { mode: 'register' });

await test('registration awaiting email confirmation stays on the form', async (h) => {
    const submit = h.submit();
    h.authRequests[0].resolve({ session: null });
    await submit;
    assert.equal(h.form.render().successMessage, 'confirmEmail');
    assert.equal(h.profileRequests.length, 0);
    assert.equal(h.navigation.length, 0);
}, { mode: 'register' });

for (const outcome of ['success', 'error']) {
    await test(`stale account ${outcome} cannot decide the newer user's destination`, async (h) => {
        h.setUser('A');
        h.setUser('B');
        await h.profile(1, null);
        const writes = h.guest.writes();
        if (outcome === 'success') await h.profile(0);
        else await h.profileError(0);
        assert.equal(h.guest.writes(), writes);
        assert.equal(h.commitRedirect(), '/users/B');
    });
}

await test('logout followed by same-user login cannot reuse the old completion result', async (h) => {
    h.setUser('A');
    await h.profile(0);
    assert.equal(h.guest.render().to, expectedTarget);
    assert.equal(h.setUser(null).kind, 'outlet');
    assert.equal(h.setUser('A').kind, 'loading');
    await h.profile(1, null);
    assert.equal(h.commitRedirect(), '/users/A');
});

for (const outcome of ['success', 'error']) {
    await test(`unmount blocks late profile ${outcome}`, async (h) => {
        h.setUser('A');
        h.dispose();
        const writes = h.guest.writes();
        if (outcome === 'success') await h.profile(0);
        else await h.profileError(0);
        assert.equal(h.guest.writes(), writes);
        assert.equal(h.navigation.length, 0);
        assert.equal(h.profileRequests[0].signal.aborted, true);
    });
}

console.log('LOGIN RETURN DESTINATION 01: PASS');
