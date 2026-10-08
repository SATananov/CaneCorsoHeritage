import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const cases = [
    { name: 'HeritagePreviewSection', path: 'src/components/HeritagePreviewSection.jsx', stop: '    let heritageIntro', expose: 'heritageData, heritageArticles, hasError', service: 'getHeritageArticles' },
    { name: 'UsersPage', path: 'src/pages/UsersPage.jsx', stop: '\n    return (', expose: 'profiles, contacts, loading, error', service: 'fetchProfiles' },
    { name: 'MyStoriesPage', path: 'src/pages/MyStoriesPage.jsx', stop: '\n    return (', expose: 'stories, isLoading, error, refreshStories, showCreate, setShowCreate, editingStory, setEditingStory', service: 'fetchMyStories' },
];

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness(spec) {
    const source = readFileSync(new URL(`../${spec.path}`, import.meta.url), 'utf8');
    const start = source.indexOf(`function ${spec.name}(`);
    const end = source.indexOf(spec.stop, start);
    assert.ok(start >= 0 && end > start, 'Extract production component logic before JSX');
    const executable = `${source.slice(start, end)}
        return { ${spec.expose} };
    }
    ${spec.name};`;
    // Only presentation/imports are replaced: execute real effects and handlers
    // with persistent hooks and controlled service promises. No network requests.
    const hooks = [];
    const effects = [];
    let cursor = 0;
    let mounted = true;
    let lateUpdates = 0;
    let language = 'en';
    let user = { id: 'A' };
    let category = null;
    const names = ['getHeritagePreview', 'getHeritageArticles', 'localizeHeritageArticles', 'fetchProfiles', 'fetchPublicContacts', 'fetchMyStories'];
    const calls = Object.fromEntries(names.map((name) => [name, []]));
    const outcomes = Object.fromEntries(names.map((name) => [name, []]));
    function mock(name, fallback) {
        return async (...args) => {
            calls[name].push(args);
            const result = outcomes[name].length ? outcomes[name].shift() : fallback(...args);
            if (result instanceof Error) throw result;
            return result;
        };
    }
    function memo(callback, deps) {
        const index = cursor++;
        if (!hooks[index] || deps.some((value, i) => !Object.is(value, hooks[index].deps[i]))) {
            hooks[index] = { deps, value: callback() };
        }
        return hooks[index].value;
    }
    const Component = runInNewContext(executable, {
        AbortController,
        useAuth: () => ({ user }),
        useLanguage: () => ({ language }),
        useNavigate: () => () => {},
        useSearchParams: () => [{ get: () => category }, () => {}],
        getTranslation: (lang, _section, key) => `${lang}:${key}`,
        useMemo: memo,
        useCallback: (callback, deps) => memo(() => callback, deps),
        useRef: (initial) => hooks[cursor++] ??= { current: initial },
        useState(initial) {
            const index = cursor++;
            const slot = hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [slot.value, (next) => {
                if (!mounted) { lateUpdates++; return; }
                slot.value = typeof next === 'function' ? next(slot.value) : next;
            }];
        },
        useEffect(callback, deps) {
            const index = cursor++;
            const previous = hooks[index];
            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                effects.push(() => {
                    previous?.cleanup?.();
                    hooks[index] = { deps, callback, cleanup: callback() };
                });
            }
        },
        getHeritagePreview: mock('getHeritagePreview', () => ({ title: language })),
        getHeritageArticles: mock('getHeritageArticles', () => [{ slug: 'article' }]),
        localizeHeritageArticles: mock('localizeHeritageArticles', (articles, lang) => articles.map((article) => ({ ...article, language: lang }))),
        fetchProfiles: mock('fetchProfiles', () => [{ id: 'member', display_name: language }]),
        fetchPublicContacts: mock('fetchPublicContacts', () => [{ user_id: 'member', email: `${language}@example.test` }]),
        fetchMyStories: mock('fetchMyStories', (id) => [{ _id: `${id}-${language}`, title: 'Saved title', description: 'Saved content' }]),
    });
    const render = () => {
        assert.ok(mounted, 'Do not render an unmounted component');
        cursor = 0;
        const view = Component({ catalogMode: true });
        effects.splice(0).forEach((effect) => effect());
        return view;
    };
    return {
        render, calls, outcomes,
        settle: async () => { await setImmediate(); return render(); },
        language: (next) => { language = next; render(); return render(); },
        user: (id) => { user = { id }; render(); return render(); },
        category: (next) => { category = next; return render(); },
        error: () => spec.name === 'HeritagePreviewSection' ? render().hasError : render().error,
        loading: () => spec.name === 'UsersPage' ? render().loading : render().isLoading,
        lateUpdates: () => lateUpdates,
        replayEffects() {
            const active = hooks.filter((slot) => slot.callback);
            active.forEach((slot) => slot.cleanup?.());
            active.forEach((slot) => { slot.cleanup = slot.callback(); });
        },
        dispose() {
            hooks.forEach((slot) => slot.cleanup?.());
            mounted = false;
        },
    };
}

let checks = 0;
for (const spec of cases) {
    async function test(label, run) {
        const h = harness(spec);
        try { await run(h); checks++; console.log(`PASS: ${spec.name}: ${label}`); }
        finally { h.dispose(); }
    }
    const heritage = spec.name === 'HeritagePreviewSection';
    const stories = spec.name === 'MyStoriesPage';
    function success(h, language = 'en', userId = 'A') {
        assert.equal(h.error(), heritage ? false : '');
        const view = h.render();
        if (heritage) {
            assert.equal(view.heritageData.title, language);
            assert.equal(view.heritageArticles[0].language, language);
        } else {
            assert.equal(h.loading(), false);
            if (stories) assert.equal(view.stories[0]._id, `${userId}-${language}`);
            else {
                assert.equal(view.profiles[0].display_name, language);
                assert.equal(view.contacts[0].email, `${language}@example.test`);
            }
        }
    }

    await test('current failure persists until the next valid load starts; success clears it', async (h) => {
        h.outcomes[spec.service].push(new Error('Current failure'));
        h.render(); await h.settle();
        assert.equal(h.error(), heritage ? true : 'en:loadError');
        if (!heritage) assert.equal(h.loading(), false);
        h.render(); assert.equal(h.error(), heritage ? true : 'en:loadError');
        const pending = deferred(); h.outcomes[spec.service].push(pending.promise);
        h.language('bg');
        assert.equal(h.error(), heritage ? false : '');
        if (!heritage) assert.equal(h.loading(), true);
        pending.resolve(heritage ? [{ slug: 'article' }] : stories ? [{ _id: 'A-bg' }] : [{ id: 'member', display_name: 'bg' }]);
        await h.settle(); success(h, 'bg');
    });

    for (const fails of [false, true]) {
        await test(`obsolete ${fails ? 'failure' : 'success'} cannot overwrite a newer language load`, async (h) => {
            const old = deferred(); h.outcomes[spec.service].push(old.promise);
            h.render(); await h.settle();
            h.language('it'); await h.settle(); success(h, 'it');
            if (fails) old.reject(new Error('Obsolete failure'));
            else old.resolve(heritage ? [{ slug: 'obsolete' }] : [{ id: 'obsolete', _id: 'obsolete' }]);
            await h.settle(); success(h, 'it');
        });
    }

    await test('old completion cannot finish a newer pending load', async (h) => {
        const old = deferred(); const next = deferred();
        h.outcomes[spec.service].push(old.promise, next.promise);
        h.render(); h.language('bg');
        old.reject(new Error('Old failure')); await h.settle();
        assert.equal(h.error(), heritage ? false : '');
        if (!heritage) assert.equal(h.loading(), true);
        next.reject(new Error('Current failure')); await h.settle();
        assert.equal(h.error(), heritage ? true : 'bg:loadError');
        if (!heritage) assert.equal(h.loading(), false);
    });

    await test('same-context rerenders do not reload; existing language reload retains data while pending', async (h) => {
        h.render(); await h.settle(); success(h);
        const before = h.render();
        h.render(); h.category('research'); if (stories) h.user('A');
        assert.equal(h.calls[spec.service].length, 1);
        const pending = deferred(); h.outcomes[spec.service].push(pending.promise);
        h.language('bg');
        const during = h.render();
        assert.equal(heritage ? during.heritageArticles : stories ? during.stories : during.profiles,
            heritage ? before.heritageArticles : stories ? before.stories : before.profiles);
        assert.equal(h.calls[spec.service].length, 2);
        pending.resolve(heritage ? [{ slug: 'article' }] : stories ? [{ _id: 'A-bg' }] : [{ id: 'member', display_name: 'bg' }]);
        await h.settle(); success(h, 'bg');
    });

    for (const fails of [false, true]) {
        await test(`unmount blocks late ${fails ? 'failure' : 'success'}`, async (h) => {
            const pending = deferred(); h.outcomes[spec.service].push(pending.promise);
            h.render(); h.dispose();
            if (fails) pending.reject(new Error('Late failure'));
            else pending.resolve(heritage ? [{ slug: 'late' }] : []);
            await setImmediate();
            assert.equal(h.lateUpdates(), 0);
        });
    }

    await test('Strict Mode cleanup invalidates the superseded request', async (h) => {
        const old = deferred(); h.outcomes[spec.service].push(old.promise);
        h.render(); h.replayEffects(); await h.settle(); success(h);
        old.reject(new Error('Old Strict Mode failure')); await h.settle(); success(h);
    });

    if (heritage) {
        await test('late localization failure is ignored after a newer successful catalog load', async (h) => {
            const localization = deferred(); h.outcomes.localizeHeritageArticles.push(localization.promise);
            h.render(); await h.settle();
            h.language('bg'); await h.settle(); success(h, 'bg');
            localization.reject(new Error('Old translation failed')); await h.settle(); success(h, 'bg');
        });
    }

    if (stories) {
        await test('action refresh recovers initial and refresh errors, preserving modal state', async (h) => {
            h.outcomes.fetchMyStories.push(new Error('Initial failure'));
            h.render(); await h.settle();
            h.render().setShowCreate(true);
            h.render().setEditingStory({ _id: 'editing' });
            await h.render().refreshStories(); success(h);
            h.outcomes.fetchMyStories.push(new Error('Refresh failed'));
            await h.render().refreshStories();
            assert.equal(h.error(), 'en:refreshError');
            assert.equal(h.loading(), false);
            await h.render().refreshStories(); success(h);
            assert.equal(h.render().showCreate, true);
            assert.equal(h.render().editingStory._id, 'editing');
        });

        for (const initial of [true, false]) {
            await test(`old ${initial ? 'initial load' : 'action refresh'} failure cannot undo a successful newer refresh`, async (h) => {
                const old = deferred(); let pending;
                if (initial) { h.outcomes.fetchMyStories.push(old.promise); h.render(); }
                else { h.render(); await h.settle(); h.outcomes.fetchMyStories.push(old.promise); pending = h.render().refreshStories(); }
                await h.render().refreshStories(); success(h);
                old.reject(new Error('Old failure')); if (pending) await pending;
                await h.settle(); success(h);
            });
        }

        await test('old refresh completion cannot finish newer refresh loading or hide its error', async (h) => {
            h.render(); await h.settle();
            const old = deferred(); const next = deferred();
            h.outcomes.fetchMyStories.push(old.promise, next.promise);
            const first = h.render().refreshStories(); const second = h.render().refreshStories();
            old.resolve([{ _id: 'old' }]); await first;
            assert.equal(h.loading(), true);
            next.reject(new Error('Current refresh failed')); await second;
            assert.equal(h.error(), 'en:refreshError');
            assert.equal(h.loading(), false);
        });

        await test('user change clears obsolete errors and ignores old modal callbacks', async (h) => {
            h.outcomes.fetchMyStories.push(new Error('Old account failure'));
            h.render(); await h.settle();
            const oldCallback = h.render().refreshStories;
            h.user('B'); assert.equal(h.error(), ''); assert.equal(h.loading(), true);
            await h.settle(); success(h, 'en', 'B');
            const count = h.calls.fetchMyStories.length;
            await oldCallback(); assert.equal(h.calls.fetchMyStories.length, count);
            success(h, 'en', 'B');
        });

        await test('save completion after language change refreshes the current language and preserves modal state', async (h) => {
            h.render(); await h.settle();
            h.render().setEditingStory({ _id: 'editing' });
            const oldCallback = h.render().refreshStories;
            h.language('bg'); await h.settle(); success(h, 'bg');
            const count = h.calls.fetchMyStories.length;
            await oldCallback(); assert.equal(h.calls.fetchMyStories.length, count + 1);
            success(h, 'bg');
            assert.equal(h.render().editingStory._id, 'editing');
        });
    }
}

console.log(`${checks} mocked checks across three production components; no network requests.`);
console.log('ERROR STATE HYGIENE 01: PASS');
