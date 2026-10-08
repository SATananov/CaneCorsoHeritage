import { supabase } from '../lib/supabaseClient';

const SUPPORTED_LANGUAGES = ['en', 'bg', 'it'];

function assertLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error('Unsupported translation language.');
    }
}

export async function fetchStoryTranslation(storyId, language, options = {}) {
    assertLanguage(language);

    const query = supabase
        .from('story_translations')
        .select('story_id, language, title, description, content, source_updated_at, provider, created_at, updated_at')
        .eq('story_id', storyId)
        .eq('language', language)
        .maybeSingle();

    if (options.signal) {
        query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data;
}


export async function fetchStoryTranslations(storyIds, language) {
    assertLanguage(language);

    const uniqueIds = [...new Set((storyIds ?? []).filter(Boolean))];
    if (uniqueIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('story_translations')
        .select('story_id, language, title, description, content, source_updated_at, provider, created_at, updated_at')
        .in('story_id', uniqueIds)
        .eq('language', language);

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function requestStoryTranslation(storyId, targetLanguage) {
    assertLanguage(targetLanguage);

    const { data, error } = await supabase.functions.invoke('translate-story', {
        body: {
            storyId,
            targetLanguage,
        },
    });

    if (error) {
        throw error;
    }

    if (!data?.translation) {
        throw new Error('Translation response is missing.');
    }

    return data.translation;
}

export function resolveStoryContent(story, translation) {
    if (!translation) {
        return story;
    }

    return {
        ...story,
        title: translation.title,
        description: translation.description,
        content: translation.content,
        _translation: translation,
    };
}

export async function localizeStoryCollection(stories, language) {
    const list = Array.isArray(stories) ? stories : [];
    const candidates = list.filter((story) => {
        const sourceLanguage = story?.original_language || 'en';
        return Boolean(story?._id && sourceLanguage !== language);
    });

    if (candidates.length === 0) {
        return list;
    }

    const ids = candidates.map((story) => story._id);
    const cached = await fetchStoryTranslations(ids, language).catch(() => []);

    const translationsById = new Map(
        cached.map((translation) => [translation.story_id, translation]),
    );

    for (const story of candidates) {
        const sourceVersion = story.updated_at ?? story.created_at ?? null;
        const existing = translationsById.get(story._id);
        const isFresh = Boolean(
            existing
            && sourceVersion
            && new Date(existing.source_updated_at).getTime() === new Date(sourceVersion).getTime(),
        );

        if (isFresh) {
            continue;
        }

        // A failed regeneration must fall back to the current author content.
        translationsById.delete(story._id);

        try {
            const generated = await requestStoryTranslation(story._id, language);
            translationsById.set(story._id, generated);
        } catch {
            // Keep author original when translation is unavailable.
        }
    }

    return list.map((story) => {
        const sourceLanguage = story?.original_language || 'en';

        if (sourceLanguage === language) {
            return story;
        }

        return resolveStoryContent(story, translationsById.get(story._id));
    });
}

