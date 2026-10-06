import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import PreviewCard from './PreviewCard';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { getHeritageArticles, getHeritagePreview } from '../services/heritageService';
import { localizeHeritageArticles } from '../services/heritageTranslationService';

function HeritagePreviewSection({ catalogMode = false }) {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'publicHeritage', key), [language]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [heritageData, setHeritageData] = useState(null);
    const [heritageArticles, setHeritageArticles] = useState(null);
    const [hasError, setHasError] = useState(false);

    const fallbackHeritageSections = useMemo(() => [
        {
            id: 'roots-and-history',
            eyebrow: t('origins'),
            title: t('rootsTitle'),
            description: t('rootsDescription'),
            details: t('rootsDetails'),
            image: '/images/cards/heritage-card.webp',
        },
        {
            id: 'built-for-purpose',
            eyebrow: t('function'),
            title: t('functionTitle'),
            description: t('functionDescription'),
            details: t('functionDetails'),
            image: '/images/cards/heritage-card.webp',
        },
        {
            id: 'function-shapes-type',
            eyebrow: t('type'),
            title: t('typeTitle'),
            description: t('typeDescription'),
            details: t('typeDetails'),
            image: '/images/cards/heritage-card.webp',
        },
    ], [t]);

    const categoryLabels = useMemo(() => ({
        stories: t('trueStories'),
        'heritage-history': t('heritageHistory'),
        understanding: t('understanding'),
        'living-care': t('livingCare'),
        research: t('research'),
    }), [t]);

    const selectedCategory = catalogMode ? searchParams.get('category') ?? 'all' : 'all';

    useEffect(() => {
        const controller = new AbortController();

        const loadHeritageData = async () => {
            try {
                const [previewData, articles] = await Promise.all([
                    getHeritagePreview({ signal: controller.signal }),
                    getHeritageArticles({ signal: controller.signal }),
                ]);
                const localizedArticles = await localizeHeritageArticles(articles, language);

                if (controller.signal.aborted) {
                    return;
                }

                setHeritageData(previewData);
                setHeritageArticles(localizedArticles);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setHasError(true);
                }
            }
        };

        loadHeritageData();

        return () => {
            controller.abort();
        };
    }, [language]);

    let heritageIntro = <p>{t('loadingPreview')}</p>;

    if (hasError) {
        heritageIntro = <p>{t('unavailable')}</p>;
    } else if (heritageData) {
        heritageIntro = (
            <>
                <p className="section-kicker">{t('previewKicker')}</p>
                <h2 id="heritage-preview-title">{t('previewTitle')}</h2>
                <p>{t('previewSummary')}</p>
            </>
        );
    }

    const sortedArticles = heritageArticles
        ?.slice()
        .sort((firstArticle, secondArticle) => firstArticle.display_order - secondArticle.display_order);

    const featuredArticles = sortedArticles
        ?.filter((article) => article.featured)
        .slice(0, 3);

    let heritageSections;

    if (catalogMode && sortedArticles) {
        heritageSections = selectedCategory === 'all'
            ? sortedArticles
            : sortedArticles.filter((article) => article.category === selectedCategory);
    } else {
        heritageSections = featuredArticles?.length === 3
            ? featuredArticles
            : fallbackHeritageSections;
    }

    const setCategory = (category) => {
        if (category === 'all') {
            setSearchParams({});
            return;
        }

        setSearchParams({ category });
    };

    const getArticleEyebrow = (article) => {
        if (article.content_type === 'heritage-story') {
            return t('heritageStory');
        }

        return categoryLabels[article.category] ?? t('defaultEyebrow');
    };

    return (
        <section
            className="visitor-section visitor-section-alt"
            aria-labelledby="heritage-preview-title"
        >
            <div className="site-container">
                <div className="visitor-feature-grid section-feature-intro" id="heritage">
                    <div className="visitor-feature-image">
                        <img src="/images/cards/heritage-card.webp" alt={t('imageAlt')} />
                    </div>

                    <div className="visitor-feature-copy" aria-live="polite">
                        {heritageIntro}
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>{catalogMode ? t('libraryTitle') : t('exploreTitle')}</h2>
                    {catalogMode && <p>{t('libraryIntro')}</p>}
                </div>

                {catalogMode && (
                    <div className="heritage-filter-bar" aria-label={t('categoriesLabel')}>
                        <button
                            type="button"
                            className={selectedCategory === 'all' ? 'heritage-filter-active' : ''}
                            onClick={() => setCategory('all')}
                        >
                            {t('all')}
                        </button>
                        {Object.entries(categoryLabels).map(([category, label]) => (
                            <button
                                type="button"
                                key={category}
                                className={selectedCategory === category ? 'heritage-filter-active' : ''}
                                onClick={() => setCategory(category)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {heritageSections.length > 0 ? (
                    <div className="story-preview-grid">
                        {heritageSections.map((item) => {
                            const isLibraryArticle = Boolean(item.slug);

                            return (
                                <PreviewCard
                                    key={item.slug ?? item.id}
                                    eyebrow={isLibraryArticle ? getArticleEyebrow(item) : item.eyebrow}
                                    title={item.title}
                                    description={isLibraryArticle ? item.summary : item.description}
                                    details={item.details}
                                    onDetails={() => navigate(`/heritage/${item.slug ?? item.id}`)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p className="heritage-empty-state">{t('empty')}</p>
                )}
            </div>
        </section>
    );
}

export default HeritagePreviewSection;
