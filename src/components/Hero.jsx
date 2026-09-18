function Hero() {
    return (
        <section className="hero" id="home">
            <div className="site-container">
                <div className="hero-shell">
                    <div className="hero-copy-panel">
                        <p className="hero-kicker">Welcome to Cane Corso Heritage</p>

                        <h1>Enter the world of Cane Corso Heritage.</h1>

                        <p className="hero-lead">
                            Stories, history and heritage presented in a simple React project
                            with the visual identity of Unico Suo Genere.
                        </p>

                        <div className="hero-actions">
                            <a className="button button-primary" href="#paths">
                                Explore
                            </a>

                            <a className="button button-outline" href="#about">
                                About the project
                            </a>
                        </div>

                        <p className="hero-note">
                            React + JavaScript · Built step by step with the course
                        </p>
                    </div>

                    <div className="hero-visual" aria-label="Unico Suo Genere visual identity">
                        <div className="hero-visual-frame">
                            <img
                                className="hero-main-image"
                                src="/images/welcome-logo.jpg"
                                alt="Unico Suo Genere Cane Corso"
                            />

                            <div className="hero-visual-caption">
                                <span>Cane Corso Heritage</span>
                                <strong>Unico Suo Genere</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;
