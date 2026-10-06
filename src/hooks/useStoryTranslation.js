import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchStoryTranslation,
    requestStoryTranslation,
    resolveStoryContent,
} from '../services/storyTranslationService';

export function useStoryTranslation({ story, language, user }) {
    const [translationState, setTranslationState] = useState({
        key: null,
        translation: null,
        status: 'idle',
    });
    const [originalState, setOriginalState] = useState({
        key: null,
        value: false,
    });

    const shouldTranslate = Boolean(
        story
        && language
        && (!story.original_language || language !== story.original_language),
    );

    const sourceVersion = story?.updated_at ?? story?.created_at ?? null;
    const translationKey = story && language
        ? `${story._id}:${language}:${sourceVersion ?? ''}`
        : null;

    const stateMatchesCurrentStory = translationState.key === translationKey;
    const translation = stateMatchesCurrentStory
        ? translationState.translation
        : null;
    const status = !story || !shouldTranslate
        ? 'idle'
        : stateMatchesCurrentStory
            ? translationState.status
            : 'loading';
    const showOriginal = originalState.key === translationKey
        ? originalState.value
        : false;

    const setShowOriginal = useCallback((nextValue) => {
        setOriginalState((current) => {
            const currentValue = current.key === translationKey
                ? current.value
                : false;
            const value = typeof nextValue === 'function'
                ? Boolean(nextValue(currentValue))
                : Boolean(nextValue);

            return {
                key: translationKey,
                value,
            };
        });
    }, [translationKey]);

    useEffect(() => {
        if (!story || !shouldTranslate || !translationKey) {
            return undefined;
        }

        const controller = new AbortController();
        let active = true;

        async function loadTranslation() {
            try {
                const cached = await fetchStoryTranslation(
                    story._id,
                    language,
                    { signal: controller.signal },
                );

                if (!active) return;

                const isFresh = Boolean(
                    cached
                    && sourceVersion
                    && new Date(cached.source_updated_at).getTime()
                        === new Date(sourceVersion).getTime(),
                );

                if (isFresh) {
                    setTranslationState({
                        key: translationKey,
                        translation: cached,
                        status: 'ready',
                    });
                    return;
                }

                const isPublicStory = story.status === 'published'
                    && story.visibility === 'community'
                    && story.moderation_status === 'approved';

                if (!isPublicStory && !user) {
                    setTranslationState({
                        key: translationKey,
                        translation: null,
                        status: cached ? 'stale' : 'signin',
                    });
                    return;
                }

                setTranslationState({
                    key: translationKey,
                    translation: null,
                    status: 'translating',
                });

                const generated = await requestStoryTranslation(story._id, language);

                if (!active) return;
                setTranslationState({
                    key: translationKey,
                    translation: generated,
                    status: 'ready',
                });
            } catch (error) {
                if (error?.name !== 'AbortError' && active) {
                    setTranslationState({
                        key: translationKey,
                        translation: null,
                        status: 'error',
                    });
                }
            }
        }

        loadTranslation();

        return () => {
            active = false;
            controller.abort();
        };
    }, [language, shouldTranslate, sourceVersion, story, translationKey, user]);

    const visibleStory = useMemo(() => {
        if (!story || showOriginal || status !== 'ready') {
            return story;
        }

        return resolveStoryContent(story, translation);
    }, [showOriginal, status, story, translation]);

    return {
        visibleStory,
        translation,
        status,
        shouldTranslate,
        showOriginal,
        setShowOriginal,
    };
}
