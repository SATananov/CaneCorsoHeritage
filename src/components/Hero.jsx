import { Link } from 'react-router';

function Hero() {
    return (
        <section className="hero">
            <div className="site-container">
                <div className="hero-shell">
                    <div className="hero-copy-panel">
                        <p className="hero-kicker">Welcome to Cane Corso Heritage</p>

                        <h1>Enter the world of Cane Corso Heritage.</h1>

                        <p className="hero-lead">Discover the stories, history and heritage of Cane Corso.</p>

                        <div className="hero-actions">
                            <Link className="button button-primary" to="/stories">
                                Explore Stories
                            </Link>

                            <Link className="button button-outline" to="/about">
                                About the project
                            </Link>
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
