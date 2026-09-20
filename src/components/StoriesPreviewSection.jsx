import PreviewCard from './PreviewCard';

function StoriesPreviewSection() {
    return (
        <section className="visitor-section" id="stories" aria-labelledby="stories-feature-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro">
                    <div className="visitor-feature-copy">
                        <p className="section-kicker">Stories</p>
                        <h2 id="stories-feature-title">Cane Corso Stories.</h2>
                        <p>
                            Explore stories about character, loyalty and the bond between Cane Corso
                            and people.
                        </p>
                    </div>

                    <div className="visitor-feature-image">
                        <img src="/images/cards/stories-card.webp" alt="Cane Corso stories" />
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Discover the stories.</h2>
                </div>

                <div className="story-preview-grid">
                    <PreviewCard
                        eyebrow="Origins"
                        title="Where every story begins"
                        description="A first look at the people, Cane Corso and moments behind the heritage."
                    />

                    <PreviewCard
                        eyebrow="Loyalty"
                        title="The bond that stays"
                        description="Stories that show character, trust and the connection built over time."
                    />

                    <PreviewCard
                        eyebrow="Legacy"
                        title="Stories carried forward"
                        description="A place for memories and experiences that become part of the heritage."
                    />
                </div>
            </div>
        </section>
    );
}

export default StoriesPreviewSection;
