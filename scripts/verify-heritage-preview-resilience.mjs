import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

function createHookRuntime() {
    const hooks = [];
    const effects = [];
    let cursor = 0;
    let mounted = true;

    return {
        context: {
            AbortController,
            useState(initial) {
                const index = cursor++;
                const slot = hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
                return [slot.value, (next) => {
                    if (!mounted) return;
                    slot.value = typeof next === 'function' ? next(slot.value) : next;
                }];
            },
            useEffect(callback, deps) {
                const index = cursor++;
                const previous = hooks[index];
                const changed = !previous
                    || deps.length !== previous.deps.length
                    || deps.some((value, i) => !Object.is(value, previous.deps[i]));
                if (changed) {
                    effects.push(() => {
                        previous?.cleanup?.();
                        hooks[index] = { deps, cleanup: callback() };
                    });
                }
            },
            useMemo(callback, deps) {
                const index = cursor++;
                const previous = hooks[index];
                const changed = !previous
                    || deps.length !== previous.deps.length
                    || deps.some((value, i) => !Object.is(value, previous.deps[i]));
                if (changed) hooks[index] = { deps, value: callback() };
                return hooks[index].value;
            },
            useCallback(callback, deps) {
                const index = cursor++;
                const previous = hooks[index];
                const changed = !previous
                    || deps.length !== previous.deps.length
                    || deps.some((value, i) => !Object.is(value, previous.deps[i]));
                if (changed) hooks[index] = { deps, value: callback };
                return hooks[index].value;
            },
        },
        render(Component, args) {
            cursor = 0;
            const view = Component(args);
            effects.splice(0).forEach((run) => run());
            return view;
        },
        async settle(Component, args) {
            await setImmediate();
            return this.render(Component, args);
        },
        dispose() {
            mounted = false;
            hooks.forEach((slot) => slot?.cleanup?.());
        },
    };
}

function previewSectionHarness({ articlesOutcome, previewOutcome }) {
    const source = readFileSync(new URL('../src/components/HeritagePreviewSection.jsx', import.meta.url), 'utf8');
    const start = source.indexOf('function HeritagePreviewSection(');
    const end = source.indexOf('    let heritageIntro', start);
    assert.ok(start >= 0 && end > start, 'Locate HeritagePreviewSection logic');
    const executable = `${source.slice(start, end)}\n        return { heritageData, heritageArticles, hasError };\n    }\n    HeritagePreviewSection;`;
    const runtime = createHookRuntime();
    const calls = { articles: 0, preview: 0 };
    let language = 'en';
    const Component = runInNewContext(executable, {
        ...runtime.context,
        useNavigate: () => () => {},
        useLanguage: () => ({ language }),
        useSearchParams: () => [{ get: () => null }, () => {}],
        getTranslation: (_lang, _section, key) => key,
        getHeritageArticles: async () => {
            calls.articles++;
            if (articlesOutcome instanceof Error) throw articlesOutcome;
            return articlesOutcome;
        },
        getHeritagePreview: async () => {
            calls.preview++;
            if (previewOutcome instanceof Error) throw previewOutcome;
            return previewOutcome;
        },
        localizeHeritageArticles: async (articles, lang) => articles.map((article) => ({ ...article, language: lang })),
    });
    return {
        calls,
        render: () => runtime.render(Component, { catalogMode: true }),
        settle: () => runtime.settle(Component, { catalogMode: true }),
        dispose: () => runtime.dispose(),
        language(next) { language = next; },
    };
}

function articleHarness({ articleOutcome, previewOutcome }) {
    const source = readFileSync(new URL('../src/pages/HeritageArticlePage.jsx', import.meta.url), 'utf8');
    const start = source.indexOf('function HeritageArticlePage() {');
    const end = source.indexOf('    const sections = article?.content?.sections;', start);
    assert.ok(start >= 0 && end > start, 'Locate HeritageArticlePage logic');
    const executable = `${source.slice(start, end)}\n        return { article, error };\n    }\n    HeritageArticlePage;`;
    const runtime = createHookRuntime();
    const calls = { article: 0, preview: 0, localization: 0 };
    const Component = runInNewContext(executable, {
        ...runtime.context,
        useNavigate: () => () => {},
        useParams: () => ({ slug: 'target' }),
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_lang, _section, key) => key,
        getHeritageArticleBySlug: async () => {
            calls.article++;
            if (articleOutcome instanceof Error) throw articleOutcome;
            return articleOutcome;
        },
        getHeritagePreview: async () => {
            calls.preview++;
            if (previewOutcome instanceof Error) throw previewOutcome;
            return previewOutcome;
        },
        localizeHeritageArticles: async (articles) => {
            calls.localization++;
            return articles.map((article) => ({ ...article, title: `Localized ${article.title}` }));
        },
    });
    return {
        calls,
        render: () => runtime.render(Component),
        settle: () => runtime.settle(Component),
        dispose: () => runtime.dispose(),
    };
}

async function test(label, create, check) {
    const harness = create();
    try {
        harness.render();
        const view = await harness.settle();
        await check(harness, view);
        console.log(`PASS: ${label}`);
    } finally {
        harness.dispose();
    }
}

await test(
    'catalog keeps primary Heritage articles when optional preview fails',
    () => previewSectionHarness({
        articlesOutcome: [{ slug: 'article', display_order: 1 }],
        previewOutcome: new Error('Preview unavailable'),
    }),
    async (h, view) => {
        assert.equal(view.hasError, false);
        assert.equal(view.heritageArticles[0].slug, 'article');
        assert.equal(view.heritageArticles[0].language, 'en');
        assert.equal(Object.keys(view.heritageData).length, 0);
        assert.equal(h.calls.articles, 1);
        assert.equal(h.calls.preview, 1);
    },
);

await test(
    'catalog still fails when the primary Heritage article read fails',
    () => previewSectionHarness({
        articlesOutcome: new Error('Catalog unavailable'),
        previewOutcome: { sections: [] },
    }),
    async (_h, view) => {
        assert.equal(view.hasError, true);
        assert.equal(view.heritageArticles, null);
    },
);

await test(
    'detail page does not request optional preview when the library article exists',
    () => articleHarness({
        articleOutcome: { slug: 'target', title: 'Primary' },
        previewOutcome: new Error('Preview should not be requested'),
    }),
    async (h, view) => {
        assert.equal(view.error, '');
        assert.equal(view.article.title, 'Localized Primary');
        assert.equal(h.calls.preview, 0);
        assert.equal(h.calls.localization, 1);
    },
);

await test(
    'detail page uses preview only as a fallback when the library article is missing',
    () => articleHarness({
        articleOutcome: null,
        previewOutcome: { sections: [{ id: 'target', title: 'Preview fallback' }] },
    }),
    async (h, view) => {
        assert.equal(view.error, '');
        assert.equal(view.article.title, 'Preview fallback');
        assert.equal(h.calls.preview, 1);
        assert.equal(h.calls.localization, 0);
    },
);

await test(
    'detail page reports a load error when the required fallback preview cannot be loaded',
    () => articleHarness({
        articleOutcome: null,
        previewOutcome: new Error('Preview unavailable'),
    }),
    async (_h, view) => {
        assert.equal(view.article, null);
        assert.equal(view.error, 'loadError');
    },
);

await test(
    'detail page reports not found when neither source contains the requested article',
    () => articleHarness({
        articleOutcome: null,
        previewOutcome: { sections: [] },
    }),
    async (_h, view) => {
        assert.equal(view.article, null);
        assert.equal(view.error, 'notFound');
    },
);

console.log('PASS: FIX 29 Heritage optional-preview resilience');
