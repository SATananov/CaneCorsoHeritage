function AboutUsgSection() {
    return (
        <section className="visitor-section" aria-labelledby="about-usg-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro about-usg-intro" id="about">
                    <div className="visitor-feature-copy about-usg-copy">
                        <p className="section-kicker">About Us</p>
                        <h2 id="about-usg-title">USG — Unico Suo Genere.</h2>
                        <p className="about-usg-lead">
                            One of a Kind. For us, Cane Corso has never been a business. It became a
                            way of life built around responsibility, character, function and respect
                            for the breed&apos;s heritage.
                        </p>
                        <p>
                            Cane Corso Heritage is the public place where we bring that journey
                            together — personal experience, historical material, stories and useful
                            knowledge that deserve to be preserved and shared.
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
                            <span className="visitor-platform-cta">Explore USG</span>
                        </a>
                    </div>
                </div>

                <article className="about-story-panel" aria-labelledby="about-story-title">
                    <div className="about-story-heading">
                        <p className="section-kicker">Our Story</p>
                        <h2 id="about-story-title">From a guardian to a way of life.</h2>
                    </div>

                    <div className="about-story-copy">
                        <p>
                            Our story began in Bulgaria with a simple need: to find a reliable
                            guardian. That search led us to the Cane Corso and changed much more than
                            we expected.
                        </p>
                        <p>
                            <strong className="about-foundation-name">Mark I</strong> and{' '}
                            <strong className="about-foundation-name">Hera</strong> became the
                            foundation of our own story. What followed was never planned as a
                            commercial breeding operation. It grew naturally into years of living
                            with Cane Corso, learning from them and taking responsibility for every
                            new life that began with us.
                        </p>
                    </div>
                </article>

                <div className="visitor-section-heading visitor-section-heading-compact about-principles-heading">
                    <p className="section-kicker">Our Principles</p>
                    <h2>What guides us.</h2>
                    <p>
                        The principles are simple, but they matter more to us than numbers, trends or
                        appearances.
                    </p>
                </div>

                <div className="about-principles-grid">
                    <article className="about-principle-card">
                        <span>01</span>
                        <h3>Responsibility first</h3>
                        <p>
                            We care where every young Cane Corso goes and what kind of life awaits it.
                            If we do not trust the future home, we simply do not place it there.
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>02</span>
                        <h3>Life together</h3>
                        <p>
                            Our Cane Corso are part of everyday life. They are not raised as objects
                            kept permanently tied or confined to cages.
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>03</span>
                        <h3>Function before fashion</h3>
                        <p>
                            A Cane Corso is more than an appearance. Character, intelligence,
                            courage, balance and purpose are essential parts of its identity.
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>04</span>
                        <h3>Responsibility continues</h3>
                        <p>
                            Our connection does not end when a Cane Corso leaves us. We keep in touch,
                            follow its development and remain ready to help when needed.
                        </p>
                    </article>
                </div>

                <article className="about-purpose-panel" aria-labelledby="about-purpose-title">
                    <div className="about-purpose-copy">
                        <p className="section-kicker">Our Purpose</p>
                        <h2 id="about-purpose-title">Preserve what the Cane Corso truly is.</h2>
                        <p>
                            Cane Corso Heritage exists to keep history, function and lived experience
                            visible. We want people to understand not only what the Cane Corso looks
                            like, but why it existed, how it worked alongside people and what should
                            not be lost as generations change.
                        </p>
                    </div>

                    <blockquote className="about-purpose-quote">
                        <p>La funzione fa il tipo.</p>
                        <footer>Function creates type.</footer>
                    </blockquote>
                </article>
            </div>
        </section>
    );
}

export default AboutUsgSection;
