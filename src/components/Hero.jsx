import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function Hero() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'hero', key);

    return (
        <section className="hero">
            <div className="site-container">
                <div className="hero-shell">
                    <div className="hero-copy-panel">
                        <p className="hero-kicker">{t('kicker')}</p>

                        <h1>{t('title')}</h1>

                        <p className="hero-lead">{t('lead')}</p>

                        <div className="hero-actions">
                            <Link className="button button-primary" to="/stories">
                                {t('stories')}
                            </Link>

                            <Link className="button button-outline" to="/about">
                                {t('about')}
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
