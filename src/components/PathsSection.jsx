import EntranceCard from './EntranceCard';

const entranceCards = [
    {
        id: 'stories',
        to: '/stories',
        eyebrow: 'Stories',
        title: 'Cane Corso Stories',
        note: 'Stories Section',
        imagePath: '/images/cards/stories-card.webp',
        imageAlt: 'Cane Corso stories',
    },
    {
        id: 'heritage',
        to: '/heritage',
        eyebrow: 'Heritage',
        title: 'History and Heritage',
        note: 'Heritage Section',
        imagePath: '/images/cards/heritage-card.webp',
        imageAlt: 'Cane Corso heritage',
    },
    {
        id: 'about',
        to: '/about',
        eyebrow: 'About USG',
        title: 'Unico Suo Genere',
        note: 'About USG',
        imagePath: '/images/cards/about-usg-platform.webp',
        imageAlt: 'Unico Suo Genere',
    },
];

function PathsSection() {
    return (
        <section className="paths-section" id="paths" aria-labelledby="paths-title">
            <div className="site-container">
                <div className="section-heading">
                    <p className="section-kicker">Explore Cane Corso Heritage</p>
                    <h2 id="paths-title">Choose where you want to begin.</h2>
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
