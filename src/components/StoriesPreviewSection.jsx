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
                        <img src="/images/cards/stories-card.png" alt="Cane Corso stories" />
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Discover the stories.</h2>
                </div>

                <div className="story-preview-grid">
                    <article className="story-preview-card">
                        <span>Origins</span>
                        <h3>Where every story begins</h3>
                        <p>A first look at the people, Cane Corso and moments behind the heritage.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Loyalty</span>
                        <h3>The bond that stays</h3>
                        <p>Stories that show character, trust and the connection built over time.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Legacy</span>
                        <h3>Stories carried forward</h3>
                        <p>A place for memories and experiences that become part of the heritage.</p>
                        <button type="button">Details</button>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default StoriesPreviewSection;
