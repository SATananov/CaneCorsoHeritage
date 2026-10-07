import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
    new URL('../src/pages/HeritageArticlePage.jsx', import.meta.url),
    'utf8',
);
const componentStart = source.indexOf('function HeritageArticlePage() {');
const presentationStart = source.indexOf('    const sections = article?.content?.sections;');
assert.ok(componentStart >= 0 && presentationStart > componentStart, 'Locate component logic before JSX');

// Execute the actual component logic and effects, replacing only presentation
// with observable state. The mocked services deliberately ignore cancellation.
const componentSource = `${source.slice(componentStart, presentationStart)}
    return { article, error };
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

function createHarness() {
    const state = [];
    const cycles = [];
    let hookIndex = 0;
    let writes = 0;
    let slug;
    let language;
    let effect;
    let cleanup;

    const Page = runInNewContext(`${componentSource}\nHeritageArticlePage;`, {
        AbortController,
        useParams: () => ({ slug }),
        useLanguage: () => ({ language }),
        useNavigate: () => () => {},
        useCallback: (callback) => callback,
        getTranslation: (selectedLanguage, _section, key) => `${selectedLanguage}:${key}`,
        useState(initial) {
            const index = hookIndex++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => { state[index] = value; writes++; }];
        },
        useEffect(callback) { effect = callback; },
        getHeritageArticleBySlug(requestSlug, { signal }) {
            const cycle = {
                slug: requestSlug,
                signal,
                article: deferred(),
                preview: deferred(),
                localization: deferred(),
                localizationStarted: false,
            };
            cycles.push(cycle);
            return cycle.article.promise;
        },
        getHeritagePreview({ signal }) {
            const cycle = cycles.at(-1);
            assert.equal(signal, cycle.signal);
            return cycle.preview.promise;
        },
        localizeHeritageArticles(articles, selectedLanguage) {
            assert.equal(articles.length, 1);
            const cycle = cycles.find((item) => item.original === articles[0]);
            assert.ok(cycle, 'Localization belongs to a fetched article');
            cycle.localizationStarted = true;
            cycle.language = selectedLanguage;
            return cycle.localization.promise;
        },
    });

    function render() {
        hookIndex = 0;
        return Page();
    }

    return {
        cycles,
        writeCount: () => writes,
        start(nextSlug, nextLanguage = 'en') {
            cleanup?.();
            slug = nextSlug;
            language = nextLanguage;
            render();
            cleanup = effect();
        },
        snapshot() {
            const { article, error } = render();
            return {
                title: article?.title ?? null,
                error,
                // HeritageArticlePage already derives its loading UI this way.
                loading: !article && !error,
            };
        },
        async fetched(index, { found = true, sections = [] } = {}) {
            const cycle = cycles[index];
            cycle.original = found ? { slug: cycle.slug, title: 'Original' } : null;
            cycle.article.resolve(cycle.original);
            cycle.preview.resolve({ sections });
            await setImmediate();
        },
        async localized(index, title) {
            const cycle = cycles[index];
            assert.equal(cycle.localizationStarted, true);
            cycle.localization.resolve([{ slug: cycle.slug, title }]);
            await setImmediate();
        },
        async failLocalization(index) {
            const cycle = cycles[index];
            assert.equal(cycle.localizationStarted, true);
            cycle.localization.reject(new Error('Mock localization failure'));
            await setImmediate();
        },
        async failFetch(index, name = 'Error') {
            const error = new Error('Mock fetch failure');
            error.name = name;
            cycles[index].article.reject(error);
            cycles[index].preview.resolve({ sections: [] });
            await setImmediate();
        },
        dispose() { cleanup?.(); },
    };
}

const pending = { title: null, error: '', loading: true };
const shown = (title) => ({ title, error: '', loading: false });

async function test(label, check) {
    const harness = createHarness();
    try {
        await check(harness);
        console.log(`PASS: ${label}`);
    } finally {
        harness.dispose();
    }
}

await test('normal article fetch waits for localization before showing A/EN', async (h) => {
    h.start('A');
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(0);
    assert.equal(h.cycles[0].language, 'en');
    assert.deepEqual(h.snapshot(), pending);
    await h.localized(0, 'A/EN');
    assert.deepEqual(h.snapshot(), shown('A/EN'));
});

await test('route A to B: late initial fetch A is ignored and B wins', async (h) => {
    h.start('A');
    h.start('B');
    assert.equal(h.cycles[0].signal.aborted, true);
    await h.fetched(1);
    await h.localized(1, 'B/EN');
    const writes = h.writeCount();
    await h.fetched(0);
    assert.equal(h.cycles[0].localizationStarted, false);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('route A to B: A localization resolves last and cannot overwrite B', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.start('B');
    await h.fetched(1);
    await h.localized(1, 'B/EN');
    const writes = h.writeCount();
    await h.localized(0, 'A/EN');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('language EN to IT: late EN localization cannot overwrite IT', async (h) => {
    h.start('A', 'en');
    await h.fetched(0);
    h.start('A', 'it');
    await h.fetched(1);
    assert.equal(h.cycles[1].language, 'it');
    await h.localized(1, 'A/IT');
    const writes = h.writeCount();
    await h.localized(0, 'A/EN');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), shown('A/IT'));
});

await test('stale localization error cannot overwrite newer success', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.start('B');
    await h.fetched(1);
    await h.localized(1, 'B/EN');
    const writes = h.writeCount();
    await h.failLocalization(0);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('stale fetch error cannot overwrite newer success', async (h) => {
    h.start('A');
    h.start('B');
    await h.fetched(1);
    await h.localized(1, 'B/EN');
    const writes = h.writeCount();
    await h.failFetch(0);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('old success cannot finish newer loading, including same-input effect restart', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.start('A');
    const writes = h.writeCount();
    await h.localized(0, 'Obsolete A');
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(1);
    await h.localized(1, 'Current A');
    assert.deepEqual(h.snapshot(), shown('Current A'));
});

await test('old error cannot finish newer loading', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.start('B');
    const writes = h.writeCount();
    await h.failLocalization(0);
    assert.equal(h.writeCount(), writes);
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(1);
    await h.localized(1, 'B/EN');
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('unmount blocks late localization and aborts initial requests', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.dispose();
    assert.equal(h.cycles[0].signal.aborted, true);
    const writes = h.writeCount();
    await h.localized(0, 'Unmounted A');
    assert.equal(h.writeCount(), writes);
});

await test('unmount blocks late localization errors', async (h) => {
    h.start('A');
    await h.fetched(0);
    h.dispose();
    const writes = h.writeCount();
    await h.failLocalization(0);
    assert.equal(h.writeCount(), writes);
});

await test('input changes clear previous content and error before the next result', async (h) => {
    h.start('A');
    await h.fetched(0);
    await h.localized(0, 'A/EN');
    h.start('B');
    assert.deepEqual(h.snapshot(), pending);
    await h.failFetch(1);
    assert.deepEqual(h.snapshot(), { title: null, error: 'en:loadError', loading: false });
    h.start('B', 'it');
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(2);
    await h.localized(2, 'B/IT');
    h.start('B', 'en');
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(3);
    await h.localized(3, 'B/EN');
    assert.deepEqual(h.snapshot(), shown('B/EN'));
});

await test('current localization error remains visible and ends loading', async (h) => {
    h.start('A', 'it');
    await h.fetched(0);
    await h.failLocalization(0);
    assert.deepEqual(h.snapshot(), { title: null, error: 'it:loadError', loading: false });
});

await test('preview fallback still works without localization', async (h) => {
    h.start('preview');
    await h.fetched(0, { found: false, sections: [{ id: 'preview', title: 'Preview' }] });
    assert.equal(h.cycles[0].localizationStarted, false);
    assert.deepEqual(h.snapshot(), shown('Preview'));
});

await test('current missing article shows not-found and a new route clears it', async (h) => {
    h.start('missing');
    await h.fetched(0, { found: false });
    assert.deepEqual(h.snapshot(), { title: null, error: 'en:notFound', loading: false });
    h.start('A');
    assert.deepEqual(h.snapshot(), pending);
    await h.fetched(1);
    await h.localized(1, 'A/EN');
    assert.deepEqual(h.snapshot(), shown('A/EN'));
});

console.log('HERITAGE ARTICLE RACE 01: PASS');
