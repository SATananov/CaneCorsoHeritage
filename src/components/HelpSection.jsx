import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

const GUIDE_ITEMS = [
    { key: 'home', route: '/' },
    { key: 'stories', route: '/stories' },
    { key: 'gallery', route: '/gallery' },
    { key: 'documents', route: '/documents' },
    { key: 'heritage', route: '/heritage' },
    { key: 'members', route: '/members' },
    { key: 'profile', route: '/my-stories' },
    { key: 'community', route: '/members' },
    { key: 'privacy', route: '/help' },
    { key: 'languages', route: '/help' },
];

function HelpSection() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'help', key);

    return (
        <section className="visitor-section visitor-section-alt" aria-labelledby="help-title">
            <div className="site-container">
                <div className="visitor-section-heading" id="help">
                    <p className="section-kicker">{t('kicker')}</p>
                    <h2 id="help-title">{t('title')}</h2>
                    <p>{t('intro')}</p>
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

                <section className="help-guide" aria-labelledby="help-guide-title">
                    <div className="help-guide-heading">
                        <p className="section-kicker">{t('guideKicker')}</p>
                        <h2 id="help-guide-title">{t('guideTitle')}</h2>
                        <p>{t('guideIntro')}</p>
                    </div>

                    <div className="help-access-grid">
                        <article className="help-access-card">
                            <span>{t('guestLabel')}</span>
                            <h3>{t('guestTitle')}</h3>
                            <p>{t('guestText')}</p>
                        </article>

                        <article className="help-access-card">
                            <span>{t('memberLabel')}</span>
                            <h3>{t('memberTitle')}</h3>
                            <p>{t('memberText')}</p>
                        </article>
                    </div>

                    <div className="help-guide-list">
                        {GUIDE_ITEMS.map((item, index) => (
                            <details className="help-guide-item" key={item.key}>
                                <summary>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <strong>{t(`${item.key}Title`)}</strong>
                                </summary>
                                <div className="help-guide-copy">
                                    <p>{t(`${item.key}Text`)}</p>
                                    {item.route !== '/help' && (
                                        <Link to={item.route}>
                                            {t('openSection')} →
                                        </Link>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>

                    <aside className="help-guide-note" aria-label={t('privacyNoteTitle')}>
                        <span>{t('privacyNoteTitle')}</span>
                        <p>{t('privacyNoteText')}</p>
                    </aside>
                </section>
            </div>
        </section>
    );
}

export default HelpSection;
