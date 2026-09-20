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
                        href="#stories"
                        eyebrow="Stories"
                        title="Cane Corso Stories"
                        note="Stories Section"
                        imagePath="/images/cards/stories-card.webp"
                        imageAlt="Cane Corso stories"
                    />

                    <EntranceCard
                        href="#heritage"
                        eyebrow="Heritage"
                        title="History and Heritage"
                        note="Heritage Section"
                        imagePath="/images/cards/heritage-card.webp"
                        imageAlt="Cane Corso heritage"
                    />

                    <EntranceCard
                        href="#about"
                        eyebrow="About USG"
                        title="Unico Suo Genere"
                        note="About USG"
                        imagePath="/images/cards/about-usg-platform.webp"
                        imageAlt="Unico Suo Genere"
                    />
                </div>
            </div>
        </section>
    );
}

export default PathsSection;
