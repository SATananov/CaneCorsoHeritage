import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/storyTranslationService.js', import.meta.url), 'utf8')
    .replace(/^import .+;\r?\n/gm, '').replace(/export /g, '');
const current = '2026-10-08T12:00:00Z';
const old = '2026-10-07T12:00:00Z';
const original = (id) => ({ _id: id, original_language: 'en', updated_at: current,
    title: 'Current title', description: 'Current description', content: 'Current author content' });
const translation = (id, version) => ({ story_id: id, source_updated_at: version,
    title: 'Translated title', description: 'Translated description', content: 'Translated content' });

function harness(cached, generated = {}, cacheError = null) {
    const calls = [];
    const supabase = {
        from(table) {
            assert.equal(table, 'story_translations');
            return { select() { return this; }, in() { return this; },
                eq: async () => ({ data: cached, error: cacheError }) };
        },
        functions: { async invoke(name, { body }) {
            assert.equal(name, 'translate-story');
            calls.push(body.storyId);
            return generated[body.storyId] ?? { error: new Error('Translation unavailable') };
        } },
    };
    return { calls, localize: new Function('supabase', `${source}\nreturn localizeStoryCollection;`)(supabase) };
}

for (const version of [old, null, 'invalid']) {
    const story = original('stale');
    const h = harness([translation('stale', version)]);
    const [result] = await h.localize([story], 'bg');
    assert.equal(result, story, 'Failed regeneration must return the current original, never stale fields');
    assert.deepEqual(h.calls, ['stale']);
}
const freshStory = original('fresh');
const staleStory = original('stale');
const mixed = harness([translation('fresh', current), translation('stale', old)]);
const result = await mixed.localize([freshStory, staleStory], 'bg');
assert.equal(result[0].content, 'Translated content');
assert.equal(result[1], staleStory);
assert.deepEqual(mixed.calls, ['stale'], 'Fresh cache should not regenerate');

const generated = translation('stale', current);
const success = harness([translation('stale', old)], { stale: { data: { translation: generated } } });
assert.equal((await success.localize([staleStory], 'bg'))[0]._translation, generated);
const missingResponse = harness([translation('stale', old)], { stale: { data: {} } });
assert.equal((await missingResponse.localize([staleStory], 'bg'))[0], staleStory);
const unavailable = harness([], {}, new Error('Cache unavailable'));
assert.equal((await unavailable.localize([staleStory], 'bg'))[0], staleStory);
const canonical = harness([translation('stale', old)]);
assert.equal((await canonical.localize([staleStory], 'en'))[0], staleStory);
assert.deepEqual(canonical.calls, []);
console.log('STORY TRANSLATION FRESHNESS: PASS (cached, stale, failed and successful regeneration)');
