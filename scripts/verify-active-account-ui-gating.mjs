import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function guestLogic() {
    const source = read('src/routing/RequireGuest.jsx')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/export default \w+;\s*$/, '')
        .replace(/return \(\s*<main[\s\S]*?<\/main>\s*\);/, "return { kind: 'loading' };")
        .replace('<Navigate to={destination} replace />', "{ kind: 'redirect', to: destination, replace: true }")
        .replace('<Navigate to="/" replace />', "{ kind: 'redirect', to: '/', replace: true }")
        .replace('<Outlet />', "{ kind: 'outlet' }");

    assert.ok(!source.includes('<Navigate') && !source.includes('<main'), 'Replace only RequireGuest presentation JSX');
    return `${source}\nRequireGuest;`;
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function mountGuest({ initialUser = null, initialLoading = false, initialRoleLoading = false, initialIsActive = false } = {}) {
    let user = initialUser;
    let loading = initialLoading;
    let roleLoading = initialRoleLoading;
    let isActive = initialIsActive;
    const profileRequests = [];
    const hooks = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];

    const RequireGuest = runInNewContext(guestLogic(), {
        AbortController,
        URL,
        console,
        useState(initial) {
            const index = cursor++;
            hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [hooks[index].value, (next) => {
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
        useAuth: () => ({ user, loading, roleLoading, isActive }),
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        useLocation: () => ({ pathname: '/login', state: { from: '/my-files' } }),
        fetchOwnPrivateProfileDetails(id, { signal } = {}) {
            const request = { id, signal, ...deferred() };
            profileRequests.push(request);
            return request.promise;
        },
    });

    function render() {
        let view;
        let attempts = 0;
        do {
            assert.ok(++attempts < 20, 'No render loop');
            cursor = 0;
            dirty = false;
            view = RequireGuest();
            if (!dirty) {
                const pending = effects;
                effects = [];
                pending.forEach((effect) => effect());
            }
        } while (dirty);
        return view;
    }

    return {
        render,
        profileRequests,
        setAuth(next) {
            if ('user' in next) user = next.user;
            if ('loading' in next) loading = next.loading;
            if ('roleLoading' in next) roleLoading = next.roleLoading;
            if ('isActive' in next) isActive = next.isActive;
            return render();
        },
        async resolveProfile(index, details) {
            profileRequests[index].resolve(details);
            await setImmediate();
            return render();
        },
        dispose() { hooks.forEach((slot) => slot.cleanup?.()); },
    };
}

{
    const h = mountGuest();
    assert.equal(h.render().kind, 'outlet');
    assert.equal(h.profileRequests.length, 0);
    h.dispose();
    console.log('PASS: guest-only routes remain available while signed out');
}

{
    const h = mountGuest({ initialUser: { id: 'A' }, initialRoleLoading: true, initialIsActive: false });
    assert.equal(h.render().kind, 'loading');
    assert.equal(h.profileRequests.length, 0, 'Unknown account status must not trigger private profile reads');
    h.dispose();
    console.log('PASS: role loading waits without reading private profile data');
}

{
    const h = mountGuest({ initialUser: { id: 'A' }, initialRoleLoading: false, initialIsActive: false });
    const view = h.render();
    assert.equal(view.kind, 'redirect');
    assert.equal(view.to, '/');
    assert.equal(view.replace, true);
    assert.equal(h.profileRequests.length, 0, 'Inactive accounts must not trigger private profile reads');
    h.dispose();
    console.log('PASS: inactive account is redirected home without a profile-completion read');
}

{
    const h = mountGuest({ initialUser: { id: 'A' }, initialRoleLoading: false, initialIsActive: true });
    assert.equal(h.render().kind, 'loading');
    assert.equal(h.profileRequests.length, 1);
    const view = await h.resolveProfile(0, {
        first_name: 'A', last_name: 'Member', country: 'Bulgaria', city: 'Sofia',
    });
    assert.equal(view.kind, 'redirect');
    assert.equal(view.to, '/my-files');
    assert.equal(view.replace, true);
    h.dispose();
    console.log('PASS: active complete account preserves the login return destination');
}

{
    const h = mountGuest({ initialUser: { id: 'A' }, initialRoleLoading: false, initialIsActive: true });
    h.render();
    const view = await h.resolveProfile(0, { first_name: 'A' });
    assert.equal(view.kind, 'redirect');
    assert.equal(view.to, '/users/A');
    assert.equal(view.replace, true);
    h.dispose();
    console.log('PASS: active incomplete account still enters profile completion');
}

const userDetails = read('src/pages/UserDetailsPage.jsx');
assert.match(
    userDetails,
    /const \{ user, roleLoading, isActive \} = useAuth\(\);/,
    'UserDetailsPage must consume active-account state',
);
assert.match(
    userDetails,
    /if \(user\?\.id === profileData\.id && !roleLoading && isActive\) \{/,
    'Private profile details must only load for an explicitly active own account',
);
assert.match(
    userDetails,
    /\{isOwnProfile && !roleLoading && isActive && \(\s*<ProfileEditor/,
    'ProfileEditor must only render for an explicitly active own account',
);
assert.match(
    userDetails,
    /const profileSetupRequired = \(\s*isOwnProfile\s*&& !roleLoading\s*&& isActive/,
    'Profile setup UI must be gated by active-account state',
);
console.log('PASS: own-profile private reads and editor UI are fail-closed on account status');

console.log('ACTIVE ACCOUNT UI GATING 01: PASS');
