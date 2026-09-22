import PreviewCard from './PreviewCard';

function HeritagePreviewSection() {
    return (
        <section className="visitor-section visitor-section-alt" id="heritage" aria-labelledby="heritage-preview-title">
            <div className="site-container">
                <div className="visitor-feature-grid section-feature-intro">
                    <div className="visitor-feature-image">
                        <img src="/images/cards/heritage-card.webp" alt="Cane Corso heritage" />
                    </div>
                    <div className="visitor-feature-copy">
                        <p className="section-kicker">Heritage</p>
                        <h2 id="heritage-preview-title">History, function and type.</h2>
                        <p>
                            Discover the history, original function and identity of the Cane Corso.
                        </p>
                    </div>
                </div>
                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Explore the heritage.</h2>
                </div>

                <div className="story-preview-grid">
                    <PreviewCard
                        eyebrow="Origins"
                        title="Roots and history"
                        description="Discover the historical background and the path that shaped Cane Corso heritage."
                        details="Historical context helps explain how the Cane Corso developed alongside people and their needs."
                    />
                    <PreviewCard
                        eyebrow="Function"
                        title="Built for purpose"
                        description="Explore the original working function and the role that shaped the Cane Corso."
                        details="Working purpose influenced character, structure and the qualities expected from the Cane Corso."
                    />
                    <PreviewCard
                        eyebrow="Type"
                        title="Function shapes type"
                        description="See how function, structure and identity connect through the heritage of Cane Corso."
                        details="Understanding type means looking beyond appearance and considering the function behind the form."
                    />
                </div>
            </div>
        </section>
    );
}

export default HeritagePreviewSection;
