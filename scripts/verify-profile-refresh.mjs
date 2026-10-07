import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { notifyProfileRefresh, subscribeProfileRefresh } from '../src/services/profileRefresh.js';

function logic(file, startMarker, endMarker, result) {
    const source = readFileSync(new URL(`../src/components/${file}.jsx`, import.meta.url), 'utf8');
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, `Locate ${file} logic before JSX`);
    return `${source.slice(start, end)}\nreturn ${result};\n}\n${file};`;
}

// Execute actual component handlers, effect dependencies, and notice visibility.
// JSX alone is replaced by observable state. All service calls are local mocks.
const editorSource = logic('ProfileEditor', 'const USERNAME_PATTERN', '    if (!editorOpen)', `{
    submitHandler, removeAvatarHandler, saving, errorMessage, message,
    setters: { displayName: setDisplayName, firstName: setFirstName, lastName: setLastName,
        country: setCountry, city: setCity, avatarFile: setAvatarFile }
}`);
const noticeSource = logic('ProfileCompletionNotice', 'const requiredFieldKeys', '\n    return (',
    '{ missingFields, completionState }');
const headerSource = logic('AuthActions', 'function AuthActions', '    if (loading || roleLoading)',
    '{ identity, profile }');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function sameDependencies(previous, next) {
    return previous?.length === next.length && next.every((value, i) => Object.is(value, previous[i]));
}

function mount(source, dependencies, props = {}) {
    const hooks = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];
    let writes = 0;
    const memo = (factory, deps) => {
        const index = cursor++;
        if (!sameDependencies(hooks[index]?.deps, deps)) hooks[index] = { deps, value: factory() };
        return hooks[index].value;
    };
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
                assert.ok(++attempts < 20, 'No render/effect loop');
                cursor = 0;
                dirty = false;
                view = Component(props);
                const pending = effects;
                effects = [];
                pending.forEach((effect) => effect());
            } while (dirty);
            return view;
        },
        writes: () => writes,
        dispose() { hooks.forEach((hook) => hook.cleanup?.()); },
    };
}

const complete = { first_name: 'First', last_name: 'Last', country: 'Bulgaria', city: 'Sofia' };
const identity = (name, avatar = 'avatar.jpg') => ({ display_name: name, avatar_url: avatar });

function harness() {
    let user = { id: 'A', email: 'a@example.test' };
    let language = 'en';
    let saved = 0;
    const requests = { editor: [], notice: [], header: [] };
    const saves = [];
    const outcomes = {};
    const warnings = [];
    const read = (target) => (id, { signal }) => {
        const request = { id, signal, ...deferred() };
        requests[target].push(request);
        // Ignore cancellation to verify guards also reject late success/error.
        return request.promise;
    };
    const write = (stage) => async (...args) => {
        saves.push([stage, ...args]);
        const result = outcomes[stage]?.shift();
        if (result instanceof Error) throw result;
        return result;
    };
    const common = {
        AbortController, notifyProfileRefresh, subscribeProfileRefresh,
        console: { warn: (...args) => warnings.push(args) },
        useLanguage: () => ({ language }),
        getTranslation: (_language, _section, key) => key,
        useAuth: () => ({ user, loading: false, roleLoading: false, isActive: true }),
    };
    const notice = mount(noticeSource, { ...common, fetchOwnPrivateProfileDetails: read('notice') });
    const header = mount(headerSource, {
        ...common, fetchProfileById: read('header'), useNavigate: () => () => {},
        getProfileAvatarUrl: (profile) => profile?.avatar_url || '',
    });
    const editor = mount(editorSource, {
        ...common, PROFILE_COUNTRIES: ['Bulgaria'], getProfileCities: () => ['Sofia'],
        fetchOwnPrivateProfileDetails: read('editor'),
        updateOwnProfile: write('public'), saveOwnPrivateProfileDetails: write('private'),
        saveProfilePublicContact: write('contact'), uploadProfileAvatar: write('avatar'),
        removeProfileAvatar: write('remove'),
    }, { profile: { id: 'A', username: 'member.a' }, onSaved: () => { saved++; } });
    const render = () => { notice.render(); header.render(); editor.render(); };
    const resolve = async (group, index, data) => {
        requests[group][index].resolve(data);
        await setImmediate();
    };
    return {
        notice, header, editor, requests, saves, outcomes, warnings, render, resolve,
        saved: () => saved,
        counts: () => [requests.notice.length, requests.header.length],
        submit: () => editor.render().submitHandler({ preventDefault() {} }),
        async initial() {
            render();
            await resolve('editor', 0, complete);
            await resolve('notice', 0, {});
            await resolve('header', 0, identity('Old Name'));
        },
        async refreshed(index, name = 'New Name', avatar = 'new-avatar.jpg') {
            await resolve('notice', index, complete);
            await resolve('header', index, identity(name, avatar));
        },
        change(values) {
            const { setters } = editor.render();
            Object.entries(values).forEach(([key, value]) => setters[key](value));
        },
        setUser(id) { user = id ? { id, email: `${id}@example.test` } : null; render(); },
        setLanguage(next) { language = next; render(); },
        dispose() { notice.dispose(); header.dispose(); editor.dispose(); },
    };
}

async function test(label, run) {
    const h = harness();
    try {
        await h.initial();
        await run(h);
        console.log(`PASS: ${label}`);
    } finally { h.dispose(); }
}

await test('initial notice and header load once and show persisted data', async (h) => {
    assert.deepEqual(h.counts(), [1, 1]);
    assert.equal(h.notice.render().missingFields.length, 4);
    assert.equal(h.header.render().identity.displayName, 'Old Name');
    assert.equal(h.header.render().identity.avatarUrl, 'avatar.jpg');
});

await test('complete successful save refreshes notice, name and avatar immediately', async (h) => {
    const avatar = deferred();
    h.outcomes.avatar = [avatar.promise];
    h.change({ displayName: 'New Name', avatarFile: { name: 'new-avatar.jpg' } });
    const save = h.submit();
    await setImmediate();
    assert.deepEqual(h.counts(), [1, 1], 'No signal before all writes succeed');
    assert.equal(h.editor.render().saving, true);
    avatar.resolve();
    await save;
    assert.deepEqual(h.counts(), [2, 2]);
    assert.equal(h.saved(), 1);
    assert.equal(h.editor.render().errorMessage, '');
    assert.equal(h.editor.render().saving, false);
    await h.refreshed(1);
    assert.equal(h.notice.render(), null, 'Complete profile hides the actual notice');
    assert.equal(h.header.render().identity.displayName, 'New Name');
    assert.equal(h.header.render().identity.avatarUrl, 'new-avatar.jpg');
    assert.equal(h.requests.editor.length, 1, 'Signal does not reload editable draft');
});

for (const stage of ['public', 'private', 'contact', 'avatar']) {
    await test(`failed ${stage} save emits no refresh or success`, async (h) => {
        h.change({ avatarFile: { name: 'avatar.jpg' } });
        h.outcomes[stage] = [new Error('Save failed')];
        await h.submit();
        assert.deepEqual(h.counts(), [1, 1]);
        assert.equal(h.saved(), 0);
        assert.equal(h.editor.render().message, '');
        assert.equal(h.editor.render().errorMessage, 'updateError');
        assert.equal(h.editor.render().saving, false);
    });
}

await test('validation failure emits no refresh', async (h) => {
    h.change({ firstName: '' });
    await h.submit();
    assert.equal(h.saves.length, 0);
    assert.deepEqual(h.counts(), [1, 1]);
});

await test('each repeated successful save triggers exactly one load per subscriber', async (h) => {
    for (let i = 1; i <= 3; i++) {
        await h.submit();
        assert.deepEqual(h.counts(), [i + 1, i + 1]);
        await h.refreshed(i, `Name ${i}`);
        h.render();
        assert.deepEqual(h.counts(), [i + 1, i + 1]);
    }
    assert.equal(h.saved(), 3);
});

await test('ordinary renders and language changes cause no extra loads', async (h) => {
    for (const language of ['bg', 'it', 'en']) {
        h.setLanguage(language);
        for (let i = 0; i < 5; i++) h.render();
    }
    assert.deepEqual(h.counts(), [1, 1]);
});

await test('user changes load the new user and ignore old-user notifications/results', async (h) => {
    notifyProfileRefresh('A');
    h.setUser('B');
    assert.deepEqual(h.counts(), [3, 3]);
    assert.equal(h.notice.render(), null);
    assert.equal(h.header.render().profile, null);
    assert.equal(h.requests.header[2].id, 'B');
    assert.equal(h.requests.notice[2].id, 'B');
    await h.refreshed(2, 'Member B');
    await h.refreshed(1, 'Late A');
    assert.equal(h.header.render().identity.displayName, 'Member B');
    notifyProfileRefresh('A');
    assert.deepEqual(h.counts(), [3, 3]);
    notifyProfileRefresh('B');
    assert.deepEqual(h.counts(), [4, 4]);
});

for (const outcome of ['success', 'error']) {
    await test(`overlapping refresh ignores obsolete ${outcome}`, async (h) => {
        notifyProfileRefresh('A');
        notifyProfileRefresh('A');
        assert.ok(h.requests.notice[1].signal.aborted);
        assert.ok(h.requests.header[1].signal.aborted);
        await h.refreshed(2);
        const writes = [h.notice.writes(), h.header.writes()];
        if (outcome === 'success') {
            await h.resolve('notice', 1, {});
            await h.resolve('header', 1, identity('Stale'));
        } else {
            h.requests.notice[1].reject(new Error('Stale'));
            h.requests.header[1].reject(new Error('Stale'));
            await setImmediate();
        }
        assert.deepEqual([h.notice.writes(), h.header.writes()], writes);
        assert.equal(h.notice.render(), null);
        assert.equal(h.header.render().identity.displayName, 'New Name');
    });
}

await test('current refresh error settles and a subsequent signal recovers', async (h) => {
    notifyProfileRefresh('A');
    h.requests.notice[1].reject(new Error('Read failed'));
    h.requests.header[1].reject(new Error('Read failed'));
    await setImmediate();
    assert.equal(h.warnings.length, 1);
    assert.equal(h.header.render().profile, null);
    assert.equal(h.notice.render().missingFields.length, 4);
    notifyProfileRefresh('A');
    await h.refreshed(2);
    assert.equal(h.notice.render(), null);
    assert.equal(h.header.render().identity.displayName, 'New Name');
});

await test('successful avatar removal refreshes identity; failed removal does not', async (h) => {
    h.outcomes.remove = [new Error('Removal failed')];
    await h.editor.render().removeAvatarHandler();
    assert.deepEqual(h.counts(), [1, 1]);
    assert.equal(h.saved(), 0);
    await h.editor.render().removeAvatarHandler();
    assert.deepEqual(h.counts(), [2, 2]);
    await h.refreshed(1, 'Old Name', '');
    assert.equal(h.header.render().identity.avatarUrl, '');
    assert.equal(h.header.render().identity.initials, 'ON');
});

for (const action of ['logout', 'unmount']) {
    await test(`${action} unsubscribes and blocks pending completions`, async (h) => {
        notifyProfileRefresh('A');
        if (action === 'logout') h.setUser(null);
        else h.dispose();
        const writes = [h.notice.writes(), h.header.writes()];
        await h.refreshed(1);
        assert.deepEqual([h.notice.writes(), h.header.writes()], writes);
        assert.ok(h.requests.header[1].signal.aborted);
        assert.ok(h.requests.notice[1].signal.aborted);
        notifyProfileRefresh('A');
        assert.deepEqual(h.counts(), [2, 2]);
        if (action === 'logout') {
            assert.equal(h.notice.render(), null);
            assert.equal(h.header.render().identity, null);
        }
    });
}

console.log('PROFILE REFRESH 01: PASS');
