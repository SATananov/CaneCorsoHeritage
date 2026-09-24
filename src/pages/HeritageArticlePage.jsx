import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { getHeritageArticles, getHeritagePreview } from '../services/heritageService';
import styles from './DetailsPage.module.css';

const categoryLabels = {
    stories: 'True Story',
    'heritage-history': 'Heritage & History',
    understanding: 'Understanding Cane Corso',
    'living-care': 'Living & Care',
    research: 'USG Research',
};

function getEyebrow(article) {
    if (article.content_type === 'heritage-story') {
        return 'Dr. Flavio Bruno · Heritage Story';
    }

    return categoryLabels[article.category] ?? article.eyebrow ?? 'Cane Corso Heritage';
}

function HeritageArticlePage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadArticle = async () => {
            try {
                const [articles, preview] = await Promise.all([
                    getHeritageArticles({ signal: controller.signal }),
                    getHeritagePreview({ signal: controller.signal }),
                ]);

                const libraryArticle = articles.find((item) => item.slug === slug);
                const previewArticle = preview.sections?.find((item) => item.id === slug);
                const match = libraryArticle ?? previewArticle;

                if (!match) {
                    setError('This Heritage article could not be found.');
                    return;
                }

                setArticle(match);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setError('Unable to load this Heritage article right now.');
                }
            }
        };

        loadArticle();

        return () => {
            controller.abort();
        };
    }, [slug]);

    const sections = article?.content?.sections;
    const hasSections = Array.isArray(sections) && sections.length > 0;

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/heritage')}>
                    ← Back to Heritage
                </button>

                {!article && !error && <LoadingSpinner label="Loading Heritage article..." />}

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
                                        <strong>Story by {article.story_by}</strong>
                                        {article.adaptation_by && (
                                            <span>English adaptation by {article.adaptation_by}</span>
                                        )}
                                    </>
                                ) : article.author ? (
                                    <strong>By {article.author}</strong>
                                ) : null}

                                {article.source_credit && <span>{article.source_credit}</span>}
                            </div>
                        )}
                    </article>
                )}
            </div>
        </main>
    );
}

export default HeritageArticlePage;
