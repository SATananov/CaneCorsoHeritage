import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import CommentsSection from '../components/CommentsSection';
import HeritageRating from '../components/heritage/HeritageRating';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { getHeritageArticleBySlug, getHeritagePreview } from '../services/heritageService';
import { localizeHeritageArticles } from '../services/heritageTranslationService';
import styles from './DetailsPage.module.css';

function HeritageArticlePage() {
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'heritageDetails', key), [language]);
    const categoryLabels = {
        stories: t('trueStory'),
        'heritage-history': t('heritageHistory'),
        understanding: t('understanding'),
        'living-care': t('livingCare'),
        research: t('research'),
    };
    const getEyebrow = (item) => {
        if (item.content_type === 'heritage-story') {
            return t('heritageStory');
        }
        return categoryLabels[item.category] ?? item.eyebrow ?? t('defaultEyebrow');
    };
    const { slug } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadArticle = async () => {
            try {
                const [libraryArticle, preview] = await Promise.all([
                    getHeritageArticleBySlug(slug, { signal: controller.signal }),
                    getHeritagePreview({ signal: controller.signal }),
                ]);

                const localizedLibrary = libraryArticle
                    ? (await localizeHeritageArticles([libraryArticle], language))[0]
                    : null;
                const previewArticle = preview.sections?.find((item) => item.id === slug);
                const match = localizedLibrary ?? previewArticle;

                if (!match) {
                    setError(t('notFound'));
                    return;
                }

                setArticle(match);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setError(t('loadError'));
                }
            }
        };

        loadArticle();

        return () => {
            controller.abort();
        };
    }, [language, slug, t]);

    const sections = article?.content?.sections;
    const hasSections = Array.isArray(sections) && sections.length > 0;

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/heritage')}>
                    {t('back')}
                </button>

                {!article && !error && <LoadingSpinner label={t('loading')} />}

                {error && (
                    <div className={styles.message} role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {article && (
                    <article className={styles.article}>
                        <p className={styles.eyebrow}>{getEyebrow(article)}</p>
                        <h1>{article.title}</h1>

                        {(article.subtitle || article.description) && (
                            <p className={styles.lead}>{article.subtitle ?? article.description}</p>
                        )}

                        {article.summary && <p className={styles.summary}>{article.summary}</p>}

                        <div className={styles.divider} />

                        {hasSections ? (
                            <div className={styles.sections}>
                                {sections.map((section) => (
                                    <section className={styles.section} key={section.heading}>
                                        <h2>{section.heading}</h2>
                                        {section.paragraphs.map((paragraph, index) => (
                                            <p key={`${section.heading}-${index}`}>{paragraph}</p>
                                        ))}
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.body}>{article.content ?? article.details}</p>
                        )}

                        {(article.story_by || article.author || article.source_credit) && (
                            <div className={styles.meta}>
                                {article.story_by ? (
                                    <>
                                        <strong>{t('storyBy')} {article.story_by}</strong>
                                        {article.adaptation_by && (
                                            <span>{t('adaptationBy')} {article.adaptation_by}</span>
                                        )}
                                    </>
                                ) : article.author ? (
                                    <strong>{t('by')} {article.author}</strong>
                                ) : null}

                                {article.source_credit && <span>{article.source_credit}</span>}
                            </div>
                        )}
                        <HeritageRating articleSlug={slug} />



                        <CommentsSection
                            targetType="heritage"
                            targetId={slug}
                        />
                    </article>
                )}
            </div>
        </main>
    );
}

export default HeritageArticlePage;
