function Hero() {
    return (
        <section className="hero" id="home">
            <div className="site-container">
                <div className="hero-shell">
                    <div className="hero-copy-panel">
                        <p className="hero-kicker">Welcome to Cane Corso Heritage</p>

                        <h1>Enter the world of Cane Corso Heritage.</h1>

                        <p className="hero-lead">Discover the stories, history and heritage of Cane Corso.</p>

                        <div className="hero-actions">
                            <a className="button button-primary" href="#paths">
                                Explore
                            </a>

                            <a className="button button-outline" href="#about">
                                About the project
                            </a>
                        </div>
                    </div>

                    <div className="hero-visual" aria-label="Unico Suo Genere visual identity">
                        <div className="hero-visual-frame">
                            <img
                                className="hero-main-image"
                                src="/images/logo.jpg"
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
