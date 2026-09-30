import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function AboutUsgSection() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'about', key);
    const platformLanguage = language === 'bg' ? 'bg' : language === 'it' ? 'it' : 'en';
    return (
        <section className="visitor-section" aria-labelledby="about-usg-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro about-usg-intro" id="about">
                    <div className="visitor-feature-copy about-usg-copy">
                        <p className="section-kicker">{t('kicker')}</p>
                        <h2 id="about-usg-title">USG — Unico Suo Genere.</h2>

                        <p className="about-usg-platform-intro">
{t('platformIntro')}
                        </p>

                        <div className="about-usg-platform-status" role="note">
                            <span>{t('platformName')}</span>
                            <strong>{t('platformStatus')}</strong>
                            <p>
{t('platformText')}
                            </p>
                        </div>

                        <p>
{t('heritagePurpose')}
                        </p>

                        <div className="about-usg-one-of-kind">
                            <span className="about-usg-one-of-kind-label">{t('oneOfKindLabel')}</span>
                            <p>
{t('oneOfKind1')}
                            </p>
                            <p>
{t('oneOfKind2')}
                            </p>
                        </div>

                        <p className="about-usg-closing-statement">
                            {t('closing')}
                        </p>
                    </div>

                    <div className="visitor-feature-image visitor-feature-image-about">
                        <a
                            className="visitor-platform-link"
                            href={`https://usg-cane-corso-platform.com/?lang=${platformLanguage}`}
                            target="_blank"
                            rel="noreferrer"
                            hrefLang={platformLanguage}
                            aria-label={t('explore')}
                        >
                            <img
                                src="/images/cards/about-usg-platform.webp"
                                alt="USG Cane Corso Platform"
                            />
                            <span className="visitor-platform-cta">{t('explore')}</span>
                        </a>
                    </div>
                </div>

                <article className="about-story-panel" aria-labelledby="about-story-title">
                    <div className="about-story-heading">
                        <p className="section-kicker">{t('storyKicker')}</p>
                        <h2 id="about-story-title">{t('storyTitle')}</h2>
                    </div>

                    <div className="about-story-copy">
                        <p>{t('story1')}</p>
                        <p>{t('story2')}</p>
                        <p>{t('story3')}</p>
                        <p>{t('story4')}</p>
                        <p>{t('story5')}</p>
                        <p className="about-story-closing">{t('story6')}</p>
                    </div>
                </article>

                <div className="visitor-section-heading visitor-section-heading-compact about-principles-heading">
                    <p className="section-kicker">{t('principlesKicker')}</p>
                    <h2>{t('principlesTitle')}</h2>
                    <p>
{t('principlesIntro')}
                    </p>
                </div>

                <div className="about-principles-grid">
                    <article className="about-principle-card">
                        <span>01</span>
                        <h3>{t('p1Title')}</h3>
                        <p>
{t('p1Text')}
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>02</span>
                        <h3>{t('p2Title')}</h3>
                        <p>
{t('p2Text')}
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>03</span>
                        <h3>{t('p3Title')}</h3>
                        <p>
{t('p3Text')}
                        </p>
                    </article>

                    <article className="about-principle-card">
                        <span>04</span>
                        <h3>{t('p4Title')}</h3>
                        <p>
{t('p4Text')}
                        </p>
                    </article>
                </div>

                <article className="about-purpose-panel" aria-labelledby="about-purpose-title">
                    <div className="about-purpose-copy">
                        <p className="section-kicker">{t('purposeKicker')}</p>
                        <h2 id="about-purpose-title">{t('purposeTitle')}</h2>
                        <p>
{t('purposeText')}
                        </p>
                    </div>

                    <blockquote className="about-purpose-quote">
                        <p>La funzione fa il tipo.</p>
                        <footer>{t('quote')}</footer>
                    </blockquote>
                </article>
            </div>
        </section>
    );
}

export default AboutUsgSection;
