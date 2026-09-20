import EntranceCard from './EntranceCard';

function PathsSection() {
    return (
        <section className="paths-section" id="paths" aria-labelledby="paths-title">
            <div className="site-container">
                <div className="section-heading">
                    <p className="section-kicker">Explore Cane Corso Heritage</p>
                    <h2 id="paths-title">Choose where you want to begin.</h2>
                </div>

                <div className="entrance-grid">
                    <EntranceCard
                        sectionId="stories"
                        eyebrow="Stories"
                        title="Cane Corso Stories"
                        note="Stories Section"
                        imagePath="/images/cards/stories-card.png"
                        imageAlt="Cane Corso stories"
                    />

                    <EntranceCard
                        sectionId="heritage"
                        eyebrow="Heritage"
                        title="History and Heritage"
                        note="Heritage Section"
                        imagePath="/images/cards/heritage-card.png"
                        imageAlt="Cane Corso heritage"
                    />

                    <EntranceCard
                        sectionId="about"
                        eyebrow="About USG"
                        title="Unico Suo Genere"
                        note="About USG"
                        imagePath="/images/cards/about-usg-card.png"
                        imageAlt="Unico Suo Genere"
                    />
                </div>
            </div>
        </section>
    );
}

export default PathsSection;
