import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function Footer() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'footer', key);

    return (
        <footer className="site-footer">
            <div className="site-container footer-inner">
                <div className="footer-brand">
                    <img src="/images/logo.jpg" alt="" />

                    <div>
                        <strong>Cane Corso Heritage</strong>
                        <span>
                            USG · Unico Suo Genere
                            <sup className="footer-trademark" aria-label="trademark">&trade;</sup>
                        </span>
                    </div>
                </div>

                <nav className="footer-nav" aria-label="Footer navigation">
                    <Link to="/about">{t('about')}</Link>
                    <Link to="/help">{t('help')}</Link>
                </nav>

                <p className="footer-legal">
                    © 2026 <strong>USG</strong> · Unico Suo Genere
                    <sup className="footer-trademark" aria-label="trademark">&trade;</sup>
                    <span aria-hidden="true"> · </span>Cane Corso Heritage
                </p>
            </div>
        </footer>
    );
}

export default Footer;
