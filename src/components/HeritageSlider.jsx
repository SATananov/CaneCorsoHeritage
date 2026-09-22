import HeritageSlide from './HeritageSlide';

const crestImage = '/images/slider/usg-crest-trim.webp';

const heritageSlides = [
    {
        id: 'stories',
        image: '/images/slider/stories.webp',
        kicker: 'Stories',
        title: 'Character. Loyalty. Bond.',
        href: '#stories',
    },
    {
        id: 'heritage',
        image: '/images/slider/heritage.webp',
        kicker: 'Heritage',
        title: 'History. Function. Type.',
        href: '#heritage',
    },
    {
        id: 'knowledge',
        image: '/images/slider/knowledge.webp',
        kicker: 'Knowledge',
        title: 'Learn. Understand. Preserve.',
        href: '#heritage',
    },
    {
        id: 'community',
        image: '/images/slider/community.webp',
        kicker: 'Community',
        title: 'People connected by Cane Corso.',
        href: '#stories',
    },
    {
        id: 'usg-global',
        image: '/images/slider/usg-global.webp',
        kicker: 'Unico Suo Genere',
        title: 'One identity. One heritage.',
        href: '#about',
    },
    {
        id: 'stories-clone',
        image: '/images/slider/stories.webp',
        kicker: 'Stories',
        title: 'Character. Loyalty. Bond.',
        clone: true,
    },
];

function HeritageSlider() {
    return (
        <section className="heritage-slider-section" aria-label="Cane Corso Heritage highlights">
            <div className="site-container">
                <div className="heritage-slider-topline">
                    <span>Discover Cane Corso Heritage</span>
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
                                href={slide.href}
                                clone={slide.clone}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeritageSlider;
