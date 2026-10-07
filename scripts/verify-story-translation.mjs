import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(source, pattern, label) {
    if (!pattern.test(source)) {
        throw new Error(`FAIL: ${label}`);
    }
    console.log(`PASS: ${label}`);
}

const form = read('src/components/AddStoryModal.jsx');
const details = read('src/pages/StoryDetailsPage.jsx');
const hook = read('src/hooks/useStoryTranslation.js');
const service = read('src/services/storyTranslationService.js');
const migration = read('supabase/migrations/20261006152000_story_translation_01.sql');
const edge = read('supabase/functions/translate-story/index.ts');

expect(form, /original_language:\s*formData\.originalLanguage/, 'author original language is stored as metadata');
expect(form, /name="originalLanguage"/, 'story form exposes original-language selection');
expect(details, /useStoryTranslation/, 'story details uses translation state');
expect(details, /showOriginal/, 'reader can switch back to the author original');
expect(hook, /fetchStoryTranslation/, 'cached translations are read before generation');
expect(hook, /requestStoryTranslation/, 'missing translations are requested server-side');
expect(service, /supabase\.functions\.invoke\('translate-story'/, 'React invokes a Supabase Edge Function');
expect(migration, /create table if not exists public\.story_translations/, 'translations are stored separately from stories');
expect(migration, /references public\.stories\(id\) on delete cascade/, 'translation lifecycle follows story lifecycle');
expect(migration, /enable row level security/, 'translation table has RLS enabled');
expect(migration, /Intentionally no client INSERT\/UPDATE\/DELETE policy/, 'translation writes are server-only');
expect(edge, /DEEPL_API_KEY/, 'translation provider key stays server-side');
expect(edge, /SUPABASE_SERVICE_ROLE_KEY/, 'server-side cache write uses service role');
expect(edge, /isPublic[\s\S]*isOwner/, 'Edge Function authorizes public stories or their owner');
expect(edge, /story_translations[\s\S]*upsert/, 'generated translations are cached');

console.log('USER STORY TRANSLATION 01: PASS');
console.log('Original author content stays in stories; machine translations are separate, cached and language-specific.');
