import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import AuthActions from './AuthActions';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function getNavClassName({ isActive }) {
    return isActive ? 'main-nav-link main-nav-link-active' : 'main-nav-link';
}

function Header() {
    const location = useLocation();
    const [mobileMenuPath, setMobileMenuPath] = useState(null);
    const isMobileMenuOpen = mobileMenuPath === location.pathname;

    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setMobileMenuPath(null);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'nav', key);
    const tg = (key) => getTranslation(language, 'globalUi', key);

    return (
        <header className="site-header">
            <div className="site-container header-inner">
                <NavLink className="brand" to="/" aria-label={tg('brandHome')} onClick={() => setMobileMenuPath(null)}>
                    <img className="brand-logo" src="/images/logo.jpg" alt="" />

                    <span className="brand-copy">
                        <small>
                            Unico Suo Genere
                            <sup className="brand-trademark" aria-label={getTranslation(language, 'systemUi', 'trademark')}>&trade;</sup>
                        </small>
                        <strong>Cane Corso Heritage</strong>
                    </span>
                </NavLink>

                                <button
                    className="mobile-nav-toggle"
                    type="button"
                    aria-label={tg('mainNavigation')}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="main-navigation"
                    onClick={() => {
                        setMobileMenuPath((currentPath) => (
                            currentPath === location.pathname ? null : location.pathname
                        ));
                    }}
                >
                    <span className="mobile-nav-toggle-bar" aria-hidden="true" />
                    <span className="mobile-nav-toggle-bar" aria-hidden="true" />
                    <span className="mobile-nav-toggle-bar" aria-hidden="true" />
                </button>

                <nav
                    id="main-navigation"
                    className={`main-nav${isMobileMenuOpen ? ' main-nav-open' : ''}`}
                    aria-label={tg('mainNavigation')}
                    onClick={(event) => {
                        if (event.target.closest('a')) {
                            setMobileMenuPath(null);
                        }
                    }}
                >
                    <NavLink className={getNavClassName} to="/" end>{t('home')}</NavLink>
                    <NavLink className={getNavClassName} to="/stories">{t('stories')}</NavLink>
                    <NavLink className={getNavClassName} to="/gallery">{t('gallery')}</NavLink>
                    <NavLink className={getNavClassName} to="/documents">{t('documents')}</NavLink>
                    <NavLink className={getNavClassName} to="/heritage">{t('heritage')}</NavLink>
                    <NavLink className={getNavClassName} to="/users">{t('members')}</NavLink>
                    <NavLink className={getNavClassName} to="/about">{t('about')}</NavLink>
                    <NavLink className={getNavClassName} to="/help">{t('help')}</NavLink>

                    <LanguageSwitcher />
                    <AuthActions className="visitor-auth" ariaLabel={tg('accountOptions')} />
                </nav>
            </div>
        </header>
    );
}

export default Header;
