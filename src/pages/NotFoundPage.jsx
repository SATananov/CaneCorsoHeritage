import { useNavigate } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function NotFoundPage() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'systemUi', key);

    return (
        <main className="route-page">
            <section className="route-topic-banner">
                <div className="site-container">
                    <h1>{t('pageNotFound')}</h1>
                    <p>{t('pageNotFoundCopy')}</p>
                    <button type="button" onClick={() => navigate('/')}>{t('backHome')}</button>
                </div>
            </section>
        </main>
    );
}

export default NotFoundPage;
