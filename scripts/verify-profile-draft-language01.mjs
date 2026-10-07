import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { notifyProfileRefresh } from '../src/services/profileRefresh.js';

const source = readFileSync(
    new URL('../src/components/ProfileEditor.jsx', import.meta.url),
    'utf8',
);
const logicStart = source.indexOf('const USERNAME_PATTERN =');
const presentationStart = source.indexOf('    if (!editorOpen) {');
assert.ok(logicStart >= 0 && presentationStart > logicStart, 'Locate editor logic before JSX');

// Execute the real editor logic, dependencies, setters and submit handler.
// Only replace JSX with observable state; no service or network code is loaded.
const editorSource = `${source.slice(logicStart, presentationStart)}
    return {
        firstName, lastName, country, city, phone,
        privateDetailsLoading, errorMessage, saving,
        label: t('firstName'), submitHandler,
        setters: { firstName: setFirstName, lastName: setLastName,
            country: setCountry, city: setCity, phone: setPhone },
    };
}`;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((success, failure) => {
        resolve = success;
        reject = failure;
    });
    return { promise, resolve, reject };
}

function sameDependencies(previous, next) {
    return previous?.length === next.length
        && next.every((value, index) => Object.is(previous[index], value));
}

function createHarness() {
    const hooks = [];
    const requests = [];
    const saves = [];
    let hookIndex = 0;
    let writes = 0;
    let dirty = false;
    let language = 'en';
    let pendingEffects = [];
    let savedCount = 0;
    let props = {
        profile: { id: 'A', display_name: 'Member A', username: 'member.a' },
        contact: null,
        currentEmail: 'a@example.test',
        onSaved() { savedCount++; },
    };

    const Editor = runInNewContext(`${editorSource}\nProfileEditor;`, {
        AbortController,
        notifyProfileRefresh,
        PROFILE_COUNTRIES: ['Bulgaria', 'Italy'],
        getProfileCities: () => [],
        useLanguage: () => ({ language }),
        getTranslation: (selectedLanguage, _section, key) => `${selectedLanguage}:${key}`,
        useState(initial) {
            const index = hookIndex++;
            if (!hooks[index]) {
                const slot = { value: initial };
                slot.setter = (next) => {
                    writes++;
                    const value = typeof next === 'function' ? next(slot.value) : next;
                    if (!Object.is(value, slot.value)) {
                        slot.value = value;
                        dirty = true;
                    }
                };
                hooks[index] = slot;
            }
            return [hooks[index].value, hooks[index].setter];
        },
        useCallback(callback, dependencies) {
            const index = hookIndex++;
            if (!sameDependencies(hooks[index]?.dependencies, dependencies)) {
                hooks[index] = { callback, dependencies };
            }
            return hooks[index].callback;
        },
        useEffect(callback, dependencies) {
            const index = hookIndex++;
            if (!sameDependencies(hooks[index]?.dependencies, dependencies)) {
                const slot = hooks[index] ?? {};
                slot.dependencies = dependencies;
                hooks[index] = slot;
                pendingEffects.push(() => {
                    slot.cleanup?.();
                    slot.cleanup = callback();
                });
            }
        },
        fetchOwnPrivateProfileDetails(userId, { signal }) {
            const request = { userId, signal, ...deferred() };
            requests.push(request);
            // Deliberately ignore abort to exercise completion guards.
            return request.promise;
        },
        updateOwnProfile: async (...args) => { saves.push(['public', ...args]); },
        saveOwnPrivateProfileDetails: async (...args) => { saves.push(['private', ...args]); },
        saveProfilePublicContact: async (...args) => { saves.push(['contact', ...args]); },
        uploadProfileAvatar: async (...args) => { saves.push(['avatar', ...args]); },
        removeProfileAvatar: async (...args) => { saves.push(['removeAvatar', ...args]); },
    });

    function render() {
        let view;
        let attempts = 0;
        do {
            assert.ok(++attempts < 20, 'Render/effect cycle stabilizes');
            dirty = false;
            hookIndex = 0;
            view = Editor(props);
            const effects = pendingEffects;
            pendingEffects = [];
            effects.forEach((commit) => commit());
        } while (dirty);
        return view;
    }

    return {
        requests,
        saves,
        render,
        writeCount: () => writes,
        savedCount: () => savedCount,
        snapshot() {
            const view = render();
            return {
                firstName: view.firstName, lastName: view.lastName,
                country: view.country, city: view.city, phone: view.phone,
                loading: view.privateDetailsLoading, error: view.errorMessage,
                label: view.label,
            };
        },
        edit(draft) {
            const view = render();
            Object.entries(draft).forEach(([field, value]) => view.setters[field](value));
            render();
        },
        setLanguage(value) { language = value; render(); },
        setProfile(id) {
            props = { ...props, profile: { ...props.profile, id } };
            render();
        },
        async resolve(index, details) {
            requests[index].resolve(details);
            await setImmediate();
        },
        async reject(index) {
            requests[index].reject(new Error('Mock private-profile failure'));
            await setImmediate();
        },
        dispose() { hooks.forEach((slot) => slot.cleanup?.()); },
    };
}

const persistedA = {
    first_name: 'Saved A', last_name: 'Surname A',
    country: 'Bulgaria', city: 'Sofia', phone: '111',
};
const persistedB = {
    first_name: 'Saved B', last_name: 'Surname B',
    country: 'Italy', city: 'Rome', phone: '222',
};
const draft = {
    firstName: 'Draft first', lastName: 'Draft last',
    country: 'Italy', city: 'Milan', phone: '333',
};

function expected(details, language = 'en', loading = false, error = '') {
    return {
        firstName: details?.first_name ?? '', lastName: details?.last_name ?? '',
        country: details?.country ?? '', city: details?.city ?? '', phone: details?.phone ?? '',
        loading, error, label: `${language}:firstName`,
    };
}

async function test(label, check) {
    const h = createHarness();
    try {
        h.render();
        await check(h);
        console.log(`PASS: ${label}`);
    } finally {
        h.dispose();
    }
}

await test('initial load populates private fields and finishes loading', async (h) => {
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].userId, 'A');
    assert.deepEqual(h.snapshot(), expected(null, 'en', true));
    await h.resolve(0, persistedA);
    assert.deepEqual(h.snapshot(), expected(persistedA));
});

await test('editing creates a local draft; language changes preserve it without refetching', async (h) => {
    await h.resolve(0, persistedA);
    h.edit(draft);
    assert.deepEqual(h.snapshot(), { ...draft, loading: false, error: '', label: 'en:firstName' });
    const writes = h.writeCount();
    for (const language of ['it', 'bg', 'en']) {
        h.setLanguage(language);
        assert.deepEqual(h.snapshot(), { ...draft, loading: false, error: '', label: `${language}:firstName` });
        assert.equal(h.requests.length, 1);
        assert.equal(h.requests[0].signal.aborted, false);
        assert.equal(h.writeCount(), writes);
    }
});

await test('same profile identity with new props preserves the draft', async (h) => {
    await h.resolve(0, persistedA);
    h.edit(draft);
    h.setProfile('A');
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.snapshot(), { ...draft, loading: false, error: '', label: 'en:firstName' });
});

await test('language change during initial loading keeps one request and updates UI text', async (h) => {
    h.setLanguage('it');
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.snapshot(), expected(null, 'it', true));
    await h.resolve(0, persistedA);
    assert.deepEqual(h.snapshot(), expected(persistedA, 'it'));
});

await test('real profile change resets private fields/loading and loads the new identity', async (h) => {
    await h.resolve(0, persistedA);
    h.edit(draft);
    h.setProfile('B');
    assert.equal(h.requests.length, 2);
    assert.equal(h.requests[1].userId, 'B');
    assert.equal(h.requests[0].signal.aborted, true);
    assert.deepEqual(h.snapshot(), expected(null, 'en', true));
    await h.resolve(1, persistedB);
    assert.deepEqual(h.snapshot(), expected(persistedB));
});

await test('stale A success cannot overwrite completed B', async (h) => {
    h.setProfile('B');
    await h.resolve(1, persistedB);
    const writes = h.writeCount();
    await h.resolve(0, persistedA);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected(persistedB));
});

await test('stale A success cannot finish loading for pending B', async (h) => {
    h.setProfile('B');
    const writes = h.writeCount();
    await h.resolve(0, persistedA);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected(null, 'en', true));
    await h.resolve(1, persistedB);
    assert.deepEqual(h.snapshot(), expected(persistedB));
});

await test('stale A error cannot overwrite B success', async (h) => {
    h.setProfile('B');
    await h.resolve(1, persistedB);
    const writes = h.writeCount();
    await h.reject(0);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected(persistedB));
});

await test('stale A error cannot finish loading for pending B', async (h) => {
    h.setProfile('B');
    const writes = h.writeCount();
    await h.reject(0);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), expected(null, 'en', true));
    await h.resolve(1, persistedB);
    assert.deepEqual(h.snapshot(), expected(persistedB));
});

await test('current load error ends loading, translates without refetch, and clears on identity change', async (h) => {
    h.setLanguage('it');
    await h.reject(0);
    assert.deepEqual(h.snapshot(), expected(null, 'it', false, 'it:loadPrivateError'));
    h.setLanguage('bg');
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.snapshot(), expected(null, 'bg', false, 'bg:loadPrivateError'));
    h.setProfile('B');
    assert.deepEqual(h.snapshot(), expected(null, 'bg', true));
    await h.resolve(1, persistedB);
    assert.deepEqual(h.snapshot(), expected(persistedB, 'bg'));
});

await test('missing private details still produce an empty editable profile', async (h) => {
    await h.resolve(0, null);
    assert.deepEqual(h.snapshot(), expected(null));
});

for (const outcome of ['success', 'error']) {
    await test(`unmount blocks late ${outcome} and loading updates`, async (h) => {
        h.dispose();
        assert.equal(h.requests[0].signal.aborted, true);
        const writes = h.writeCount();
        if (outcome === 'success') await h.resolve(0, persistedA);
        else await h.reject(0);
        assert.equal(h.writeCount(), writes);
    });
}

await test('saving after language change uses the preserved draft and existing save sequence', async (h) => {
    await h.resolve(0, persistedA);
    h.edit(draft);
    h.setLanguage('it');
    let prevented = false;
    await h.render().submitHandler({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.deepEqual(h.saves.map(([operation]) => operation), ['public', 'private', 'contact']);
    const [, userId, savedDraft] = h.saves[1];
    assert.equal(userId, 'A');
    assert.deepEqual({ ...savedDraft }, draft);
    assert.equal(h.savedCount(), 1);
    assert.equal(h.render().saving, false);
    assert.equal(h.snapshot().error, '');
});

console.log('PROFILE DRAFT LANGUAGE 01: PASS');
