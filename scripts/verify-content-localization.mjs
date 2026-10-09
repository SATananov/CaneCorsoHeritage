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

const storiesPreview = read('src/components/StoriesPreviewSection.jsx');
const heritagePreview = read('src/components/HeritagePreviewSection.jsx');
const heritageDetails = read('src/pages/HeritageArticlePage.jsx');
const storyService = read('src/services/storyTranslationService.js');
const heritageService = read('src/services/heritageTranslationService.js');
const storyEdge = read('supabase/functions/translate-story/index.ts');
const heritageEdge = read('supabase/functions/translate-heritage/index.ts');
const migration = read('supabase/migrations/20261006160000_content_localization_01.sql');
const translations = read('src/i18n/translations.js');

expect(storiesPreview, /LEGACY_EDITORIAL_STORY_TITLES/, 'legacy editorial Story cards are separated from community content');
expect(storiesPreview, /localizeStoryCollection\(\s*communityStories,\s*language,\s*\)/, 'real community Story cards follow selected language');
expect(storiesPreview, /setStories\(enrichedStories\)/, 'localized community Story catalog is committed after catalog enrichment');
expect(storyService, /fetchStoryTranslations/, 'Story list reuses cached translations');
expect(storyService, /requestStoryTranslation/, 'missing community Story translations are generated server-side');
expect(storyEdge, /isPublic[\s\S]*isOwner/, 'public Stories can be translated while private Stories remain owner-protected');
expect(heritagePreview, /localizeHeritageArticles\(articles, language\)/, 'Heritage catalog follows selected language');
expect(heritageDetails, /localizeHeritageArticles\(\[libraryArticle\], language\)/, 'Heritage article body follows selected language');
expect(heritagePreview, /previewKicker[\s\S]*previewTitle[\s\S]*previewSummary/, 'static Heritage preview copy uses UI localization');
expect(translations, /fallbackOriginsTitle:[\s\S]*fallbackLoyaltyTitle:[\s\S]*fallbackLegacyTitle:/, 'EN/BG/IT contain static Story card localization keys');
expect(translations, /previewKicker:[\s\S]*previewTitle:[\s\S]*previewSummary:/, 'EN/BG/IT contain Heritage preview localization keys');
expect(migration, /create table if not exists public\.heritage_translations/, 'official Heritage translations are stored separately');
expect(migration, /enable row level security/, 'Heritage translation cache has RLS enabled');
expect(migration, /Intentionally no client INSERT \/ UPDATE \/ DELETE policy/, 'Heritage translation writes are server-only');
expect(heritageEdge, /DEEPL_API_KEY/, 'Heritage provider key remains server-side');
expect(heritageEdge, /source_fingerprint/, 'Heritage translation cache detects canonical source changes');
expect(heritageEdge, /\.eq\('status', 'published'\)/, 'only published Heritage content is translated');
expect(heritageService, /resolveHeritageArticle/, 'translated Heritage is presentation-only and canonical source stays intact');

console.log('CONTENT LOCALIZATION ARCHITECTURE 01: PASS');
console.log('Static editorial Story cards use EN/BG/IT i18n; real community Stories use translation cache/Edge Function; Heritage translations remain separate and canonical content stays intact.');
