import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import LoadingSpinner from './LoadingSpinner';
import PreviewCard from './PreviewCard';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchStories } from '../services/storyService';

function StoriesPreviewSection() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'publicStories', key);
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUsingFallback, setIsUsingFallback] = useState(false);

    const fallbackStories = useMemo(() => [
        {
            _id: 'origins-story',
            eyebrow: t('fallbackOrigins'),
            title: t('fallbackOriginsTitle'),
            description: t('fallbackOriginsDescription'),
            details: t('fallbackOriginsDetails'),
        },
        {
            _id: 'loyalty-story',
            eyebrow: t('fallbackLoyalty'),
            title: t('fallbackLoyaltyTitle'),
            description: t('fallbackLoyaltyDescription'),
            details: t('fallbackLoyaltyDetails'),
        },
        {
            _id: 'legacy-story',
            eyebrow: t('fallbackLegacy'),
            title: t('fallbackLegacyTitle'),
            description: t('fallbackLegacyDescription'),
            details: t('fallbackLegacyDetails'),
        },
    ], [language]);

    useEffect(() => {
        const controller = new AbortController();

        const loadStories = async () => {
            try {
                const data = await fetchStories({ signal: controller.signal });
                setStories(data);
                setIsUsingFallback(false);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setStories(fallbackStories);
                    setIsUsingFallback(true);
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
    }, [fallbackStories]);

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

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>{t('discover')}</h2>
                </div>

                <div className="story-preview-grid">
                    {isLoading ? (
                        <LoadingSpinner label={t('loading')} />
                    ) : (
                        stories.map((story) => (
                            <PreviewCard
                                key={story._id}
                                eyebrow={story.eyebrow}
                                title={story.title}
                                description={story.description}
                                details={story.details}
                                onDetails={
                                    isUsingFallback
                                        ? undefined
                                        : () => navigate(`/stories/${story._id}`)
                                }
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

export default StoriesPreviewSection;
