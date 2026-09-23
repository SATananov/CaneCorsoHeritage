import { useEffect, useState } from 'react';
import HeritageDetailsModal from './HeritageDetailsModal';
import PreviewCard from './PreviewCard';
import { getHeritageArticles, getHeritagePreview } from '../services/heritageService';

const fallbackHeritageSections = [
    {
        id: 'roots-and-history',
        eyebrow: 'Origins',
        title: 'Roots and history',
        description: 'Discover the historical background and the path that shaped Cane Corso heritage.',
        details: 'Historical context helps explain how the Cane Corso developed alongside people and their needs.',
        content: 'The Cane Corso heritage is understood through the relationship between people, place and practical work. Looking at roots and history gives context to the qualities preserved in the Cane Corso over time.',
        image: '/images/cards/heritage-card.webp',
    },
    {
        id: 'built-for-purpose',
        eyebrow: 'Function',
        title: 'Built for purpose',
        description: 'Explore the original working function and the role that shaped the Cane Corso.',
        details: 'Working purpose influenced character, structure and the qualities expected from the Cane Corso.',
        content: 'The Cane Corso was shaped by purpose. Working needs influenced the qualities expected from the Cane Corso: presence, balance, responsiveness and the ability to act when required.',
        image: '/images/cards/heritage-card.webp',
    },
    {
        id: 'function-shapes-type',
        eyebrow: 'Type',
        title: 'Function shapes type',
        description: 'See how function, structure and identity connect through the heritage of Cane Corso.',
        details: 'Understanding type means looking beyond appearance and considering the function behind the form.',
        content: 'Type is more than appearance. Structure, character and identity make most sense when they are read together with function: the work and purpose that shaped them.',
        image: '/images/cards/heritage-card.webp',
    },
];

const categoryLabels = {
    stories: 'True Story',
    'heritage-history': 'Heritage & History',
    understanding: 'Understanding Cane Corso',
    'living-care': 'Living & Care',
    research: 'USG Research',
};

function getArticleEyebrow(article) {
    if (article.content_type === 'heritage-story') {
        return 'Dr. Flavio Bruno · Heritage Story';
    }

    return categoryLabels[article.category] ?? 'Cane Corso Heritage';
}

function HeritagePreviewSection() {
    const [heritageData, setHeritageData] = useState(null);
    const [heritageArticles, setHeritageArticles] = useState(null);
    const [hasError, setHasError] = useState(false);
    const [selectedHeritage, setSelectedHeritage] = useState(null);

    useEffect(() => {
        let isActive = true;

        const loadHeritageData = async () => {
            try {
                const [previewData, articles] = await Promise.all([
                    getHeritagePreview(),
                    getHeritageArticles(),
                ]);

                if (isActive) {
                    setHeritageData(previewData);
                    setHeritageArticles(articles);
                }
            } catch {
                if (isActive) {
                    setHasError(true);
                }
            }
        };

        loadHeritageData();

        return () => {
            isActive = false;
        };
    }, []);

    let heritageIntro = <p>Loading heritage preview...</p>;

    if (hasError) {
        heritageIntro = <p>Heritage preview is temporarily unavailable.</p>;
    } else if (heritageData) {
        heritageIntro = (
            <>
                <p className="section-kicker">{heritageData.eyebrow}</p>
                <h2 id="heritage-preview-title">{heritageData.title}</h2>
                <p>{heritageData.summary}</p>
            </>
        );
    }

    const featuredArticles = heritageArticles
        ?.filter((article) => article.featured)
        .sort((firstArticle, secondArticle) => firstArticle.display_order - secondArticle.display_order)
        .slice(0, 3);

    const heritageSections = featuredArticles?.length === 3
        ? featuredArticles
        : heritageData?.sections ?? fallbackHeritageSections;

    return (
        <section
            className="visitor-section visitor-section-alt"
            aria-labelledby="heritage-preview-title"
        >
            <div className="site-container">
                <div className="visitor-feature-grid section-feature-intro" id="heritage">
                    <div className="visitor-feature-image">
                        <img src="/images/cards/heritage-card.webp" alt="Cane Corso heritage" />
                    </div>

                    <div className="visitor-feature-copy" aria-live="polite">
                        {heritageIntro}
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Explore the heritage.</h2>
                </div>

                <div className="story-preview-grid">
                    {heritageSections.map((heritage) => {
                        const isLibraryArticle = Boolean(heritage.slug);

                        return (
                            <PreviewCard
                                key={heritage.slug ?? heritage.id}
                                eyebrow={isLibraryArticle ? getArticleEyebrow(heritage) : heritage.eyebrow}
                                title={heritage.title}
                                description={isLibraryArticle ? heritage.summary : heritage.description}
                                details={heritage.details}
                                onDetails={() => setSelectedHeritage(heritage)}
                            />
                        );
                    })}
                </div>
            </div>

            {selectedHeritage && (
                <HeritageDetailsModal
                    heritage={selectedHeritage}
                    onClose={() => setSelectedHeritage(null)}
                />
            )}
        </section>
    );
}

export default HeritagePreviewSection;
