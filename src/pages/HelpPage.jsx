import { useParams } from 'react-router';
import HelpSection from '../components/HelpSection';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';

function HelpPage() {
    const { topic } = useParams();
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'helpPage', key);
    const helpTopics = {
        explore: { title: t('exploreTitle'), text: t('exploreText') },
        read: { title: t('readTitle'), text: t('readText') },
        share: { title: t('shareTitle'), text: t('shareText') },
    };
    const selectedTopic = topic ? helpTopics[topic] : null;

    return (
        <main className="route-page">
            {topic && (
                <section className="route-topic-banner" aria-live="polite">
                    <div className="site-container">
                        <p className="section-kicker">{t('topic')}</p>
                        <h1>{selectedTopic?.title ?? t('notFound')}</h1>
                        <p>{selectedTopic?.text ?? t('chooseTopic')}</p>
                    </div>
                </section>
            )}
            <HelpSection />
        </main>
    );
}

export default HelpPage;
