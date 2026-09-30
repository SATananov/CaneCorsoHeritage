import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function HelpSection() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'help', key);

    return (
        <section className="visitor-section visitor-section-alt" aria-labelledby="help-title">
            <div className="site-container">
                <div className="visitor-section-heading" id="help">
                    <p className="section-kicker">{t('kicker')}</p>
                    <h2 id="help-title">{t('title')}</h2>
                    <p>
                        {t('intro')}
                    </p>
                </div>

                <div className="help-grid">
                    <article className="help-card">
                        <span>01</span>
                        <h3>{t('exploreTitle')}</h3>
                        <p>{t('exploreText')}</p>
                        <Link className="help-topic-link" to="/help/explore">{t('exploreLink')}</Link>
                    </article>

                    <article className="help-card">
                        <span>02</span>
                        <h3>{t('readTitle')}</h3>
                        <p>{t('readText')}</p>
                        <Link className="help-topic-link" to="/help/read">{t('readLink')}</Link>
                    </article>

                    <article className="help-card help-card-join">
                        <span>03</span>
                        <h3>{t('shareTitle')}</h3>
                        <p>{t('shareText')}</p>
                        <Link className="help-topic-link" to="/help/share">{t('shareLink')}</Link>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default HelpSection;
