import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/pages/UserDetailsPage.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function getInitial(');
const end = source.search(/\n    return \(\r?\n        <main/);
assert.ok(start >= 0 && end > start, 'Locate actual page logic before JSX');
// The route gate must protect all rendered member content, errors and loading.
assert.match(source, /\{isCurrentMember && profile && \(/);
assert.match(source, /\{isCurrentMember && error && \(/);
assert.match(source, /\{t\(error\)\}/);
assert.match(source, /\{\(loading \|\| !isCurrentMember\) && <LoadingSpinner/);
const pageSource = `${source.slice(start, end)}
    return { profile, stories, sharedFiles, publicContact, privateDetails,
        privateDetailsLoaded, loading, error, isCurrentMember, profileSetupRequired,
        errorText: error ? t(error) : '', refresh: () => setRefreshKey((key) => key + 1) };
}
UserDetailsPage;`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function sameDependencies(previous, next) {
    return previous?.length === next.length && next.every((value, i) => Object.is(value, previous[i]));
}

function harness() {
    const hooks = [];
    const requests = { profile: [], private: [], stories: [], files: [], contact: [] };
    const warnings = [];
    let userId = 'A';
    let viewerId = 'A';
    let language = 'en';
    let cursor = 0;
    let dirty = false;
    let pendingEffects = [];
    let writes = 0;
    const fetchMock = (group) => (id, options = {}) => {
        const request = { id, signal: options.signal, ...deferred() };
        requests[group].push(request);
        // Ignore abort intentionally, including for the file service without a signal.
        return request.promise;
    };
    const Page = runInNewContext(pageSource, {
        AbortController,
        console: { warn: (...args) => warnings.push(args) },
        useParams: () => ({ userId }),
        useNavigate: () => () => {},
        useAuth: () => ({ user: viewerId ? { id: viewerId } : null }),
        useLanguage: () => ({ language }),
        getTranslation: (locale, _section, key) => `${locale}:${key}`,
        getProfileAvatarUrl: (profile) => profile?.avatar_url || '',
        fetchProfileById: fetchMock('profile'),
        fetchOwnPrivateProfileDetails: fetchMock('private'),
        fetchPublishedStoriesByAuthor: fetchMock('stories'),
        fetchCommunityFilesByUser: fetchMock('files'),
        fetchProfilePublicContact: fetchMock('contact'),
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
        useCallback(callback, deps) {
            const index = cursor++;
            if (!sameDependencies(hooks[index]?.deps, deps)) hooks[index] = { deps, callback };
            return hooks[index].callback;
        },
        useEffect(callback, deps) {
            const index = cursor++;
            if (!sameDependencies(hooks[index]?.deps, deps)) {
                const previous = hooks[index];
                const slot = { deps };
                hooks[index] = slot;
                pendingEffects.push(() => {
                    previous?.cleanup?.();
                    slot.cleanup = callback();
                });
            }
        },
    });
    function render(commitEffects = true) {
        let view;
        let attempts = 0;
        do {
            assert.ok(++attempts < 20, 'Render/effect cycle stabilizes');
            cursor = 0;
            dirty = false;
            view = Page();
            if (commitEffects) {
                const effects = pendingEffects;
                pendingEffects = [];
                effects.forEach((effect) => effect());
            }
        } while (dirty);
        return view;
    }
    async function resolve(group, index, value) {
        assert.ok(requests[group][index], `${group} request ${index} exists`);
        requests[group][index].resolve(value);
        await setImmediate();
    }
    async function reject(group, index) {
        requests[group][index].reject(new Error('Mock failure'));
        await setImmediate();
    }
    async function secondary(index, id) {
        await resolve('stories', index, [{ id: `story-${id}`, author_id: id }]);
        await resolve('files', index, [{ id: `file-${id}`, user_id: id }]);
        await resolve('contact', index, { user_id: id, email: `${id}@example.test` });
    }
    return {
        requests, warnings, render, resolve, reject, secondary,
        writes: () => writes,
        route(id, commit = true) { userId = id; return render(commit); },
        viewer(id) { viewerId = id; return render(); },
        language(locale) { language = locale; return render(); },
        async loadedA() {
            await resolve('profile', 0, { id: 'A', display_name: 'Member A' });
            await resolve('private', 0, { first_name: 'Private A' });
            await secondary(0, 'A');
        },
        dispose() { hooks.forEach((slot) => slot.cleanup?.()); },
    };
}

function assertReset(view) {
    assert.equal(view.profile, null);
    assert.equal(view.stories.length, 0);
    assert.equal(view.sharedFiles.length, 0);
    assert.equal(view.publicContact, null);
    assert.equal(view.privateDetails, null);
    assert.equal(view.privateDetailsLoaded, false);
    assert.equal(view.loading, true);
    assert.equal(view.error, '');
}

async function test(label, run) {
    const h = harness();
    try {
        h.render();
        await run(h);
        console.log(`PASS: ${label}`);
    } finally { h.dispose(); }
}

await test('normal A load includes private and secondary data', async (h) => {
    assertReset(h.render());
    await h.loadedA();
    const view = h.render();
    assert.equal(view.profile.id, 'A');
    assert.equal(view.loading, false);
    assert.equal(view.error, '');
    assert.equal(view.privateDetails.first_name, 'Private A');
    assert.equal(view.privateDetailsLoaded, true);
    assert.equal(view.stories[0].author_id, 'A');
    assert.equal(view.sharedFiles[0].user_id, 'A');
    assert.equal(view.publicContact.user_id, 'A');
});

await test('route change clears every member state before effects commit', async (h) => {
    await h.loadedA();
    assertReset(h.route('B', false));
    assert.equal(h.requests.profile.length, 1, 'Reset happens before the B effect starts');
    assertReset(h.render());
    assert.ok(h.requests.profile[0].signal.aborted);
    await h.resolve('profile', 1, { id: 'B' });
    await h.secondary(1, 'B');
    const view = h.render();
    assert.equal(view.profile.id, 'B');
    assert.equal(view.privateDetails, null);
    assert.equal(view.privateDetailsLoaded, false);
    assert.equal(view.stories[0].author_id, 'B');
    assert.equal(view.sharedFiles[0].user_id, 'B');
    assert.equal(view.publicContact.user_id, 'B');
    assert.equal(view.loading, false);
});

for (const outcome of ['success', 'error', 'notFound']) {
    await test(`late A profile ${outcome} cannot overwrite completed B`, async (h) => {
        h.route('B');
        await h.resolve('profile', 1, { id: 'B' });
        await h.secondary(0, 'B');
        const writes = h.writes();
        if (outcome === 'error') await h.reject('profile', 0);
        else await h.resolve('profile', 0, outcome === 'notFound' ? null : { id: 'A' });
        assert.equal(h.writes(), writes);
        assert.equal(h.render().profile.id, 'B');
        assert.equal(h.render().error, '');
        assert.equal(h.requests.private.length, 0);
    });
}

for (const outcome of ['error', 'notFound']) {
    await test(`B ${outcome} cannot leave A visible`, async (h) => {
        await h.loadedA();
        h.route('B');
        if (outcome === 'error') await h.reject('profile', 1);
        else await h.resolve('profile', 1, null);
        const view = h.render();
        assert.equal(view.profile, null);
        assert.equal(view.stories.length, 0);
        assert.equal(view.sharedFiles.length, 0);
        assert.equal(view.publicContact, null);
        assert.equal(view.privateDetails, null);
        assert.equal(view.loading, false);
        assert.equal(view.errorText, `en:${outcome === 'error' ? 'loadError' : 'notFound'}`);
    });
}

await test('old error clears on route change and translates without reloading', async (h) => {
    await h.reject('profile', 0);
    assert.equal(h.language('bg').errorText, 'bg:loadError');
    assert.equal(h.requests.profile.length, 1);
    assertReset(h.route('B', false));
    assertReset(h.render());
    await h.resolve('profile', 1, { id: 'B' });
    await h.secondary(0, 'B');
    assert.equal(h.render().error, '');
});

for (const outcome of ['success', 'error']) {
    await test(`stale A ${outcome} cannot finish pending B loading`, async (h) => {
        h.route('B');
        const writes = h.writes();
        if (outcome === 'error') await h.reject('profile', 0);
        else await h.resolve('profile', 0, { id: 'A' });
        assert.equal(h.writes(), writes);
        assertReset(h.render());
    });
}

await test('late secondary data including non-abortable files cannot replace B', async (h) => {
    await h.resolve('profile', 0, { id: 'A' });
    await h.resolve('private', 0, { first_name: 'Private A' });
    h.route('B');
    await h.resolve('profile', 1, { id: 'B' });
    await h.secondary(1, 'B');
    const writes = h.writes();
    await h.secondary(0, 'A');
    assert.equal(h.writes(), writes);
    assert.equal(h.render().stories[0].author_id, 'B');
    assert.equal(h.render().sharedFiles[0].user_id, 'B');
    assert.equal(h.render().publicContact.user_id, 'B');
});

for (const outcome of ['success', 'error']) {
    await test(`stale private ${outcome} cannot write or launch obsolete secondary requests`, async (h) => {
        await h.resolve('profile', 0, { id: 'A' });
        h.route('B');
        await h.resolve('profile', 1, { id: 'B' });
        await h.secondary(0, 'B');
        const writes = h.writes();
        if (outcome === 'error') await h.reject('private', 0);
        else await h.resolve('private', 0, { first_name: 'Late A' });
        assert.equal(h.writes(), writes);
        assert.equal(h.requests.stories.length, 1);
        assert.equal(h.requests.files.length, 1);
        assert.equal(h.render().privateDetails, null);
    });
}

await test('current private and secondary failures preserve existing fallback behavior', async (h) => {
    await h.resolve('profile', 0, { id: 'A' });
    await h.reject('private', 0);
    await h.reject('stories', 0);
    await h.resolve('files', 0, [{ user_id: 'A' }]);
    await h.reject('contact', 0);
    const view = h.render();
    assert.equal(view.profile.id, 'A');
    assert.equal(view.privateDetailsLoaded, true);
    assert.equal(view.profileSetupRequired, true);
    assert.equal(view.stories.length, 0);
    assert.equal(view.sharedFiles[0].user_id, 'A');
    assert.equal(view.publicContact, null);
    assert.equal(view.loading, false);
    assert.equal(view.error, '');
    assert.equal(h.warnings.length, 2);
});

await test('same-user renders and language changes preserve data; explicit refresh reloads', async (h) => {
    await h.loadedA();
    const profile = h.render().profile;
    for (const language of ['bg', 'it', 'en']) {
        h.language(language);
        h.route('A');
        assert.equal(h.render().profile, profile);
    }
    assert.equal(h.requests.profile.length, 1);
    h.render().refresh();
    assertReset(h.render());
    assert.equal(h.requests.profile.length, 2);
    await h.resolve('profile', 1, { id: 'A', display_name: 'Updated' });
    await h.resolve('private', 1, {});
    await h.secondary(1, 'A');
    assert.equal(h.render().profile.display_name, 'Updated');
});

await test('viewer change clears own private state and reloads under the new auth identity', async (h) => {
    await h.loadedA();
    assertReset(h.viewer('B'));
    await h.resolve('profile', 1, { id: 'A' });
    await h.secondary(1, 'A');
    assert.equal(h.requests.private.length, 1);
    assert.equal(h.render().privateDetails, null);
    assert.equal(h.render().privateDetailsLoaded, false);
});

for (const stage of ['profile', 'private', 'secondary']) {
    for (const outcome of ['success', 'error']) {
        await test(`unmount blocks late ${stage} ${outcome}`, async (h) => {
            if (stage !== 'profile') await h.resolve('profile', 0, { id: 'A' });
            if (stage === 'secondary') await h.resolve('private', 0, {});
            h.dispose();
            const writes = h.writes();
            if (stage === 'secondary') {
                if (outcome === 'success') await h.secondary(0, 'A');
                else for (const group of ['stories', 'files', 'contact']) await h.reject(group, 0);
            } else if (outcome === 'error') await h.reject(stage, 0);
            else await h.resolve(stage, 0, { id: 'A' });
            assert.equal(h.writes(), writes);
            assert.ok(h.requests.profile[0].signal.aborted);
        });
    }
}

console.log('USER DETAILS RACE 01: PASS');
