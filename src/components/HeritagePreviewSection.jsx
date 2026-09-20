function HeritagePreviewSection() {
    return (
        <section className="visitor-section visitor-section-alt" id="heritage" aria-labelledby="heritage-preview-title">
            <div className="site-container">
                <div className="visitor-feature-grid section-feature-intro">
                    <div className="visitor-feature-image">
                        <img src="/images/cards/heritage-card.png" alt="Cane Corso heritage" />
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
                    <article className="story-preview-card">
                        <span>Origins</span>
                        <h3>Roots and history</h3>
                        <p>Discover the historical background and the path that shaped Cane Corso heritage.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Function</span>
                        <h3>Built for purpose</h3>
                        <p>Explore the original working function and the role that shaped the Cane Corso.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Type</span>
                        <h3>Function shapes type</h3>
                        <p>See how function, structure and identity connect through the heritage of Cane Corso.</p>
                        <button type="button">Details</button>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default HeritagePreviewSection;
