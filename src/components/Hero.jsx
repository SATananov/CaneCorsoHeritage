function Hero() {
    return (
        <section className="hero" id="home">
            <div className="site-container hero-grid">
                <div className="hero-copy">
                    <p className="hero-kicker">Cane Corso Heritage</p>

                    <h1>Preserving character, stories and heritage.</h1>

                    <p className="hero-lead">
                        A focused React project dedicated to Cane Corso stories, built with
                        a modern structure and the visual identity of Unico Suo Genere.
                    </p>

                    <div className="hero-actions">
                        <a className="button button-primary" href="#stories">
                            Explore stories
                        </a>

                        <a className="button button-outline" href="#heritage">
                            Our purpose
                        </a>
                    </div>

                    <p className="hero-note">
                        React + JavaScript · Developed step by step with the course
                    </p>
                </div>

                <div className="hero-visual" aria-label="Unico Suo Genere brand artwork">
                    <div className="hero-glow" aria-hidden="true"></div>
                    <img
                        className="hero-art"
                        src="/images/one-of-a-kind.png"
                        alt="Unico Suo Genere - One of a Kind"
                    />
                </div>
            </div>
        </section>
    );
}

export default Hero;
