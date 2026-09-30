import HeritageSlide from './HeritageSlide';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

const crestImage = '/images/slider/usg-crest-trim.webp';

function HeritageSlider() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'globalUi', key);

    const heritageSlides = [
        {
            id: 'stories',
            image: '/images/slider/stories.webp',
            kicker: t('storiesKicker'),
            title: t('storiesTitle'),
            to: '/stories',
        },
        {
            id: 'heritage',
            image: '/images/slider/heritage.webp',
            kicker: t('heritageKicker'),
            title: t('heritageTitle'),
            to: '/heritage',
        },
        {
            id: 'knowledge',
            image: '/images/slider/knowledge.webp',
            kicker: t('knowledgeKicker'),
            title: t('knowledgeTitle'),
            to: '/heritage?category=understanding',
        },
        {
            id: 'community',
            image: '/images/slider/community.webp',
            kicker: t('communityKicker'),
            title: t('communityTitle'),
            to: '/stories',
        },
        {
            id: 'usg-global',
            image: '/images/slider/usg-global.webp',
            kicker: t('usgKicker'),
            title: t('usgTitle'),
            to: '/about',
        },
        {
            id: 'stories-clone',
            image: '/images/slider/stories.webp',
            kicker: t('storiesKicker'),
            title: t('storiesTitle'),
            clone: true,
        },
    ];

    return (
        <section className="heritage-slider-section" id="home" aria-label={t('sliderLabel')}>
            <div className="site-container">
                <div className="heritage-slider-topline">
                    <span>{t('sliderTopline')}</span>
                </div>
                <div className="heritage-slider">
                    <div className="heritage-slider-track">
                        {heritageSlides.map((slide) => (
                            <HeritageSlide
                                key={slide.id}
                                image={slide.image}
                                sideImage={crestImage}
                                kicker={slide.kicker}
                                title={slide.title}
                                to={slide.to}
                                clone={slide.clone}
                                exploreLabel={t('explore')}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeritageSlider;
