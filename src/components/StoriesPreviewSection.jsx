import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import LoadingSpinner from './LoadingSpinner';
import PreviewCard from './PreviewCard';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { enrichStoriesWithCatalogMetrics } from '../services/storyCatalogService';
import { fetchStories } from '../services/storyService';
import { localizeStoryCollection } from '../services/storyTranslationService';

const PAGE_SIZE = 9;

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
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);

    const displayEyebrow = (story) => {
        if (story.editorial_source) {
            const editorialEyebrows = {
                Origins: t('fallbackOrigins'),
                Loyalty: t('fallbackLoyalty'),
                Legacy: t('fallbackLegacy'),
            };

            return editorialEyebrows[story.eyebrow] ?? story.eyebrow;
        }

        return story.eyebrow === 'Community'
            ? tm('communityEyebrow')
            : story.eyebrow === 'My Own'
                ? tm('privateEyebrow')
                : story.eyebrow;
    };

    useEffect(() => {
        const controller = new AbortController();

        const loadStories = async () => {
            setIsLoading(true);
            setLoadError('');
            setMetricsWarning(false);

            try {
                const data = await fetchStories({ signal: controller.signal });

                const localizedStories = await localizeStoryCollection(
                    data,
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

    const communityStories = visibleStories.filter((story) => !story.editorial_source);
    const editorialStories = visibleStories.filter((story) => Boolean(story.editorial_source));
    const totalPages = Math.max(1, Math.ceil(communityStories.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pagedCommunityStories = communityStories.slice(pageStart, pageStart + PAGE_SIZE);

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
                    <div className="story-catalog-title-row">
                        <h2>{t('communityTitle')}</h2>

                        <div className="story-view-toggle" role="group" aria-label={t('viewMode')}>
                            <button
                                type="button"
                                className={viewMode === 'grid' ? 'is-active' : ''}
                                aria-pressed={viewMode === 'grid'}
                                aria-label={t('gridView')}
                                title={t('gridView')}
                                onClick={() => { setViewMode('grid'); setCurrentPage(1); }}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="6" height="6" rx="1" />
                                    <rect x="14" y="4" width="6" height="6" rx="1" />
                                    <rect x="4" y="14" width="6" height="6" rx="1" />
                                    <rect x="14" y="14" width="6" height="6" rx="1" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className={viewMode === 'list' ? 'is-active' : ''}
                                aria-pressed={viewMode === 'list'}
                                aria-label={t('listView')}
                                title={t('listView')}
                                onClick={() => { setViewMode('list'); setCurrentPage(1); }}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <line x1="8" y1="6" x2="20" y2="6" />
                                    <line x1="8" y1="12" x2="20" y2="12" />
                                    <line x1="8" y1="18" x2="20" y2="18" />
                                    <circle cx="4" cy="6" r="1" />
                                    <circle cx="4" cy="12" r="1" />
                                    <circle cx="4" cy="18" r="1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p>{t('communityIntro')}</p>
                </div>

                <div className="story-catalog-controls" aria-label={t('catalogControlsLabel')}>
                    <label className="story-catalog-search">
                        <span>{t('searchLabel')}</span>
                        <input
                            type="search"
                            value={searchTerm}
                            placeholder={t('searchPlaceholder')}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </label>

                    <div className="story-catalog-sort" aria-label={t('sortLabel')}>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.NEWEST ? 'is-active' : ''}
                            onClick={() => { setSortMode(SORT_OPTIONS.NEWEST); setCurrentPage(1); }}
                        >
                            {t('sortNewest')}
                        </button>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.TOP_RATED ? 'is-active' : ''}
                            onClick={() => { setSortMode(SORT_OPTIONS.TOP_RATED); setCurrentPage(1); }}
                        >
                            {t('sortTopRated')}
                        </button>
                        <button
                            type="button"
                            className={sortMode === SORT_OPTIONS.MOST_COMMENTED ? 'is-active' : ''}
                            onClick={() => { setSortMode(SORT_OPTIONS.MOST_COMMENTED); setCurrentPage(1); }}
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
                    <div className="story-catalog-sections">
                        {communityStories.length > 0 && (
                            <>
                                <div className={viewMode === 'list' ? 'story-preview-grid story-preview-list' : 'story-preview-grid'}>
                                    {pagedCommunityStories.map((story) => (
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

                                {totalPages > 1 && (
                                    <nav className="story-pagination" aria-label={t('paginationLabel')}>
                                        <button type="button" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                                            {t('previousPage')}
                                        </button>
                                        <div className="story-page-numbers">
                                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                                <button
                                                    key={page}
                                                    type="button"
                                                    className={page === safePage ? 'is-active' : ''}
                                                    aria-current={page === safePage ? 'page' : undefined}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <button type="button" disabled={safePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                                            {t('nextPage')}
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}

                        {editorialStories.length > 0 && (
                            <section className="story-editorial-section" aria-labelledby="story-editorial-title">
                                <div className="visitor-section-heading visitor-section-heading-compact story-editorial-heading">
                                    <p className="section-kicker">{t('editorialKicker')}</p>
                                    <h2 id="story-editorial-title">{t('editorialTitle')}</h2>
                                    <p>{t('editorialIntro')}</p>
                                </div>

                                <div className="story-preview-grid story-editorial-grid">
                                    {editorialStories.map((story) => (
                                        <div
                                            className="story-catalog-card story-editorial-card"
                                            key={story.id ?? story._id}
                                        >
                                            <PreviewCard
                                                eyebrow={displayEyebrow(story)}
                                                title={story.title}
                                                description={story.description}
                                                details={story.details}
                                                onDetails={() => navigate(`/stories/${story.id ?? story._id}`)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default StoriesPreviewSection;
