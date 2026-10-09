import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import LoadingSpinner from './LoadingSpinner';
import PreviewCard from './PreviewCard';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { enrichStoriesWithCatalogMetrics } from '../services/storyCatalogService';
import { fetchStories } from '../services/storyService';
import { localizeStoryCollection } from '../services/storyTranslationService';

const LEGACY_EDITORIAL_STORY_TITLES = new Set([
    'Where every story begins',
    'The bond that stays',
    'Stories carried forward',
]);

const SORT_OPTIONS = {
    NEWEST: 'newest',
    TOP_RATED: 'topRated',
    MOST_COMMENTED: 'mostCommented',
};

function StoriesPreviewSection() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'publicStories', key), [language]);
    const tm = (key) => getTranslation(language, 'memberProfile', key);

    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [metricsWarning, setMetricsWarning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState(SORT_OPTIONS.NEWEST);

    const displayEyebrow = (story) => story.eyebrow === 'Community'
        ? tm('communityEyebrow')
        : story.eyebrow === 'My Own'
            ? tm('privateEyebrow')
            : story.eyebrow;

    useEffect(() => {
        const controller = new AbortController();

        const loadStories = async () => {
            setIsLoading(true);
            setLoadError('');
            setMetricsWarning(false);

            try {
                const data = await fetchStories({ signal: controller.signal });

                const communityStories = data.filter(
                    (story) => !LEGACY_EDITORIAL_STORY_TITLES.has(story.title),
                );

                const localizedStories = await localizeStoryCollection(
                    communityStories,
                    language,
                );

                if (controller.signal.aborted) {
                    return;
                }

                const enrichedStories = await enrichStoriesWithCatalogMetrics(
                    localizedStories,
                    { signal: controller.signal },
                );

                if (!controller.signal.aborted) {
                    setStories(enrichedStories);
                    setMetricsWarning(
                        enrichedStories.some((story) => story.metricsWarning),
                    );
                }
            } catch (error) {
                if (error.name !== 'AbortError' && !controller.signal.aborted) {
                    setStories([]);
                    setMetricsWarning(false);
                    setLoadError(t('catalogError'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadStories();

        return () => {
            controller.abort();
        };
    }, [language, t]);

    const visibleStories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filteredStories = normalizedSearch
            ? stories.filter((story) => {
                const searchableText = [
                    story.title,
                    story.description,
                    story.eyebrow,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchableText.includes(normalizedSearch);
            })
            : [...stories];

        return filteredStories.sort((firstStory, secondStory) => {
            if (sortMode === SORT_OPTIONS.TOP_RATED) {
                const ratingDifference = (secondStory.averageRating ?? 0) - (firstStory.averageRating ?? 0);

                if (ratingDifference !== 0) {
                    return ratingDifference;
                }

                return (secondStory.ratingCount ?? 0) - (firstStory.ratingCount ?? 0);
            }

            if (sortMode === SORT_OPTIONS.MOST_COMMENTED) {
                return (secondStory.commentCount ?? 0) - (firstStory.commentCount ?? 0);
            }

            return new Date(secondStory.created_at ?? 0).getTime()
                - new Date(firstStory.created_at ?? 0).getTime();
        });
    }, [searchTerm, sortMode, stories]);

    return (
        <section className="visitor-section" aria-labelledby="stories-feature-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro" id="stories">
                    <div className="visitor-feature-copy">
                        <p className="section-kicker">{t('kicker')}</p>
                        <h2 id="stories-feature-title">{t('title')}</h2>
                        <p>{t('intro')}</p>
                    </div>

                    <div className="visitor-feature-image">
                        <img src="/images/cards/stories-card.webp" alt={t('title')} />
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact story-catalog-heading">
                    <h2>{t('communityTitle')}</h2>
                    <p>{t('communityIntro')}</p>
                </div>

                <div className="story-catalog-controls" aria-label={t('catalogControlsLabel')}>
                    <label className="story-catalog-search">
                        <span>{t('searchLabel')}</span>
                        <input
                            type="search"
                            value={searchTerm}
                            placeholder={t('searchPlaceholder')}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </label>

                    <div className="story-catalog-sort" aria-label={t('sortLabel')}>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.NEWEST ? 'is-active' : ''}
                            onClick={() => setSortMode(SORT_OPTIONS.NEWEST)}
                        >
                            {t('sortNewest')}
                        </button>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.TOP_RATED ? 'is-active' : ''}
                            onClick={() => setSortMode(SORT_OPTIONS.TOP_RATED)}
                        >
                            {t('sortTopRated')}
                        </button>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.MOST_COMMENTED ? 'is-active' : ''}
                            onClick={() => setSortMode(SORT_OPTIONS.MOST_COMMENTED)}
                        >
                            {t('sortMostCommented')}
                        </button>
                    </div>
                </div>

                {!isLoading && !loadError && metricsWarning && (
                    <p className="story-catalog-state" role="status">
                        {t('catalogMetricsError')}
                    </p>
                )}

                {isLoading ? (
                    <LoadingSpinner label={t('loading')} />
                ) : loadError ? (
                    <p className="story-catalog-state">{loadError}</p>
                ) : visibleStories.length === 0 ? (
                    <p className="story-catalog-state">{searchTerm.trim() ? t('catalogNoResults') : t('catalogEmpty')}</p>
                ) : (
                    <div className="story-preview-grid">
                        {visibleStories.map((story) => (
                            <div className="story-catalog-card" key={story.id ?? story._id}>
                                <PreviewCard
                                    eyebrow={displayEyebrow(story)}
                                    title={story.title}
                                    description={story.description}
                                    details={story.details}
                                    onDetails={() => navigate(`/stories/${story.id ?? story._id}`)}
                                />

                                <div className="story-catalog-metrics" aria-label={t('metricsLabel')}>
                                    <span>
                                        ★ {story.averageRating == null ? '—' : Number(story.averageRating).toFixed(1)}
                                        {' '}({story.ratingCount == null ? '—' : story.ratingCount})
                                    </span>
                                    <span>
                                        {t('commentsMetric')}: {story.commentCount == null ? '—' : story.commentCount}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default StoriesPreviewSection;
