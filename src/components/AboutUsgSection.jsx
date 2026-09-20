function AboutUsgSection() {
    return (
        <section className="visitor-section" id="about" aria-labelledby="about-usg-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro">
                    <div className="visitor-feature-copy">
                        <p className="section-kicker">About USG</p>
                        <h2 id="about-usg-title">Unico Suo Genere.</h2>
                        <p>
                            Unico Suo Genere means one of a kind. Cane Corso Heritage brings together
                            stories, history and knowledge in one place.
                        </p>
                        <p>
                            The goal is simple: preserve the heritage and make it easy to discover.
                        </p>
                    </div>

                    <div className="visitor-feature-image visitor-feature-image-about">
                        <a
                            className="visitor-platform-link"
                            href="https://usg-cane-corso-platform.com/?lang=en"
                            target="_blank"
                            rel="noreferrer"
                            hrefLang="en"
                            aria-label="Open the USG Cane Corso Platform in English"
                        >
                            <img
                                src="/images/cards/about-usg-platform.webp"
                                alt="USG Cane Corso Platform"
                            />
                            <span className="visitor-platform-cta">Explore</span>
                        </a>
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Discover the idea behind USG.</h2>
                </div>

                <div className="story-preview-grid">
                    <article className="story-preview-card">
                        <span>Heritage</span>
                        <h3>Preserve what matters</h3>
                        <p>Keep the history, stories and identity of Cane Corso visible and easy to discover.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Knowledge</span>
                        <h3>Learn and understand</h3>
                        <p>Bring useful Cane Corso knowledge together in a clear and accessible place.</p>
                        <button type="button">Details</button>
                    </article>

                    <article className="story-preview-card">
                        <span>Platform</span>
                        <h3>Connect the pieces</h3>
                        <p>Discover the wider USG Cane Corso Platform and its public areas.</p>
                        <button type="button">Details</button>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default AboutUsgSection;
