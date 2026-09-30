import EntranceCard from './EntranceCard';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function PathsSection() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'globalUi', key);

    const entranceCards = [
        {
            id: 'stories',
            to: '/stories',
            eyebrow: t('storiesCardEyebrow'),
            title: t('storiesCardTitle'),
            note: t('storiesCardNote'),
            imagePath: '/images/cards/stories-card.webp',
            imageAlt: t('storiesCardTitle'),
        },
        {
            id: 'heritage',
            to: '/heritage',
            eyebrow: t('heritageCardEyebrow'),
            title: t('heritageCardTitle'),
            note: t('heritageCardNote'),
            imagePath: '/images/cards/heritage-card.webp',
            imageAlt: t('heritageCardTitle'),
        },
        {
            id: 'about',
            to: '/about',
            eyebrow: t('aboutCardEyebrow'),
            title: t('aboutCardTitle'),
            note: t('aboutCardNote'),
            imagePath: '/images/cards/about-usg-platform.webp',
            imageAlt: t('aboutCardTitle'),
        },
    ];

    return (
        <section className="paths-section" id="paths" aria-labelledby="paths-title">
            <div className="site-container">
                <div className="section-heading">
                    <p className="section-kicker">{t('pathsKicker')}</p>
                    <h2 id="paths-title">{t('pathsTitle')}</h2>
                </div>
                <div className="entrance-grid">
                    {entranceCards.map((card) => (
                        <EntranceCard
                            key={card.id}
                            to={card.to}
                            eyebrow={card.eyebrow}
                            title={card.title}
                            note={card.note}
                            imagePath={card.imagePath}
                            imageAlt={card.imageAlt}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default PathsSection;
