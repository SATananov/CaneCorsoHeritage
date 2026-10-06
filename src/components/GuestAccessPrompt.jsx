import { NavLink } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function GuestAccessPrompt({ location, admin = false }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'guest', key);
    const destination = location
        ? {
            pathname: location.pathname,
            search: location.search,
        }
        : null;

    return (
        <main className="guest-access-page">
            <div className="site-container guest-access-shell">
                <section className="guest-access-card" aria-labelledby="guest-access-title">
                    <p className="guest-access-kicker">
                        {admin ? t('restricted') : t('membersOnly')}
                    </p>

                    <h1 id="guest-access-title">
                        {t('title')}
                    </h1>

                    <p className="guest-access-copy">
                        {admin
                            ? t('adminCopy')
                            : t('memberCopy')}
                    </p>

                    <div className="guest-access-actions">
                        <NavLink
                            className="guest-access-login"
                            to="/login"
                            state={destination ? { from: destination } : undefined}
                        >
                            {t('login')}
                        </NavLink>

                        {!admin && (
                            <NavLink
                                className="guest-access-register"
                                to="/register"
                                state={destination ? { from: destination } : undefined}
                            >
                                {t('register')}
                            </NavLink>
                        )}
                    </div>

                    {!admin && (
                        <p className="guest-access-note">
                            {t('note')}
                        </p>
                    )}
                </section>
            </div>
        </main>
    );
}

export default GuestAccessPrompt;
