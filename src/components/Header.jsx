import { NavLink } from 'react-router';
import AuthActions from './AuthActions';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function getNavClassName({ isActive }) {
    return isActive ? 'main-nav-link main-nav-link-active' : 'main-nav-link';
}

function Header() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'nav', key);
    const tg = (key) => getTranslation(language, 'globalUi', key);

    return (
        <header className="site-header">
            <div className="site-container header-inner">
                <NavLink className="brand" to="/" aria-label={tg('brandHome')}>
                    <img className="brand-logo" src="/images/logo.jpg" alt="" />

                    <span className="brand-copy">
                        <small>
                            Unico Suo Genere
                            <sup className="brand-trademark" aria-label={getTranslation(language, 'systemUi', 'trademark')}>&trade;</sup>
                        </small>
                        <strong>Cane Corso Heritage</strong>
                    </span>
                </NavLink>

                <nav className="main-nav" aria-label={tg('mainNavigation')}>
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
