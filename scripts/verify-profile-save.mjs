import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const editorFile = readFileSync(new URL('src/components/ProfileEditor.jsx', root), 'utf8');
const pageFile = readFileSync(new URL('src/pages/UserDetailsPage.jsx', root), 'utf8');
const translationsFile = readFileSync(new URL('src/i18n/translations.js', root), 'utf8');

const logicStart = editorFile.indexOf('const USERNAME_PATTERN');
const logicEnd = editorFile.indexOf('    // Translate load failures', logicStart);
assert.ok(logicStart >= 0 && logicEnd > logicStart, 'ProfileEditor logic must be locatable before JSX');

const editorSource = `${editorFile.slice(logicStart, logicEnd)}
    return {
        submitHandler,
        saving,
        error,
        message,
        setters: {
            displayName: setDisplayName,
            firstName: setFirstName,
            lastName: setLastName,
            country: setCountry,
            city: setCity,
            avatarFile: setAvatarFile,
        },
    };
}
ProfileEditor;`;

function sameDependencies(previous, next) {
    return previous?.length === next.length
        && next.every((value, index) => Object.is(value, previous[index]));
}

function mount(source, dependencies, props) {
    const hooks = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];

    const Component = runInNewContext(source, {
        ...dependencies,
        useCallback(callback) {
            return callback;
        },
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
                assert.ok(++attempts < 20, 'ProfileEditor must settle without render/effect loops');
                cursor = 0;
                dirty = false;
                view = Component(props);
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

async function createHarness(failingStage = null) {
    const notifications = [];
    const savedResults = [];
    const calls = [];
    const complete = {
        first_name: 'First',
        last_name: 'Last',
        country: 'Bulgaria',
        city: 'Sofia',
        phone: '',
    };

    const write = (stage) => async () => {
        calls.push(stage);
        if (stage === failingStage) {
            throw new Error(`${stage} failed`);
        }
    };

    const editor = mount(editorSource, {
        AbortController,
        PROFILE_COUNTRIES: ['Bulgaria'],
        getProfileCities: () => ['Sofia'],
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        fetchOwnPrivateProfileDetails: async () => complete,
        updateOwnProfile: write('public'),
        saveOwnPrivateProfileDetails: write('private'),
        saveProfilePublicContact: write('contact'),
        uploadProfileAvatar: write('avatar'),
        removeProfileAvatar: write('remove'),
        notifyProfileRefresh: (userId) => notifications.push(userId),
    }, {
        profile: { id: 'A', username: 'member.a', avatar_path: 'old-avatar.jpg' },
        contact: null,
        currentEmail: 'a@example.test',
        onSaved: (result) => savedResults.push(result),
    });

    editor.render();
    await setImmediate();
    await setImmediate();
    const view = editor.render();
    view.setters.avatarFile({ name: 'new-avatar.jpg' });
    editor.render();

    return {
        editor,
        notifications,
        savedResults,
        calls,
        async submit() {
            await editor.render().submitHandler({ preventDefault() {} });
            return editor.render();
        },
    };
}

async function test(label, failingStage, assertions) {
    const harness = await createHarness(failingStage);
    try {
        const view = await harness.submit();
        assertions(harness, view);
        console.log(`PASS: ${label}`);
    } finally {
        harness.editor.dispose();
    }
}

await test('first write failure remains a full failure with no refresh', 'public', (h, view) => {
    assert.deepEqual(h.calls, ['public']);
    assert.deepEqual(h.notifications, []);
    assert.deepEqual(h.savedResults, []);
    assert.equal(view.error, 'updateError');
    assert.equal(view.message, '');
    assert.equal(view.saving, false);
});

for (const [stage, expectedCalls] of [
    ['private', ['public', 'private']],
    ['contact', ['public', 'private', 'contact']],
    ['avatar', ['public', 'private', 'contact', 'avatar']],
]) {
    await test(`${stage} failure after a committed write reports a partial save`, stage, (h, view) => {
        assert.deepEqual(h.calls, expectedCalls);
        assert.deepEqual(h.notifications, ['A']);
        assert.equal(h.savedResults.length, 1);
        assert.equal(h.savedResults[0]?.partial, true);
        assert.equal(view.error, 'partialUpdate');
        assert.equal(view.message, '');
        assert.equal(view.saving, false);
    });
}

await test('complete save preserves the normal success flow', null, (h, view) => {
    assert.deepEqual(h.calls, ['public', 'private', 'contact', 'avatar']);
    assert.deepEqual(h.notifications, ['A']);
    assert.equal(h.savedResults.length, 1);
    assert.equal(h.savedResults[0]?.partial, false);
    assert.equal(view.error, '');
    assert.equal(view.message, 'updated');
    assert.equal(view.saving, false);
});

assert.match(
    pageFile,
    /onSaved=\{\(\{ partial = false \} = \{\}\) => \{[\s\S]*partial \? 'partialUpdate' : ''[\s\S]*setRefreshKey/,
    'UserDetailsPage must refresh persisted profile state and retain a partial-save notice',
);
assert.match(
    pageFile,
    /profileSaveNotice\.userId === profile\.id[\s\S]*getTranslation\(language, 'profileEditor', profileSaveNotice\.key\)/,
    'Partial-save notice must be scoped to the current profile and localized',
);
assert.equal(
    (translationsFile.match(/partialUpdate:/g) || []).length,
    3,
    'partialUpdate must exist exactly once in EN, BG and IT profileEditor translations',
);

console.log('PROFILE PARTIAL SAVE 01: PASS');
