import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import CommentsSection from '../components/CommentsSection';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaRating from '../components/MediaRating';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchCommunityGalleryImages } from '../services/fileService';
import styles from './GalleryPage.module.css';

function GalleryPage() {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'gallery', key),
        [language],
    );
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadGallery() {
            try {
                const data = await fetchCommunityGalleryImages({
                    signal: controller.signal,
                });

                if (active && !controller.signal.aborted) {
                    setImages(data);
                }
            } catch (loadError) {
                if (
                    active
                    && !controller.signal.aborted
                    && loadError?.name !== 'AbortError'
                ) {
                    setError(t('loadError'));
                }
            } finally {
                if (active && !controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadGallery();

        return () => {
            active = false;
            controller.abort();
        };
    }, [t]);

    useEffect(() => {
        if (!preview) return undefined;

        const previousOverflow = document.body.style.overflow;

        function closeOnEscape(event) {
            if (event.key === 'Escape') {
                setPreview(null);
            }
        }

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [preview]);

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.heading}>
                    <p className="section-kicker">{t('communityGallery')}</p>
                    <h1>{t('title')}</h1>
                    <p>{t('intro')}</p>
                </header>

                {loading && <LoadingSpinner label={t('loading')} />}

                {!loading && error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && images.length === 0 && (
                    <div className={styles.message}>{t('empty')}</div>
                )}

                {!loading && !error && images.length > 0 && (
                    <section className={styles.grid} aria-label={t('title')}>
                        {images.map((file) => (
                            <article className={styles.card} key={file.id}>
                                <button
                                    className={styles.previewButton}
                                    type="button"
                                    onClick={() => setPreview(file)}
                                    aria-label={`${t('openImage')}: ${file.file_name}`}
                                >
                                    <img
                                        className={styles.image}
                                        src={file.url}
                                        alt={file.file_name}
                                    />
                                </button>

                                <div className={styles.cardBody}>
                                    <strong className={styles.fileName}>
                                        {file.file_name}
                                    </strong>

                                    <div className={styles.storyLinkSlot}>
                                        {file.story_id && (
                                            <Link
                                                className={styles.storyLink}
                                                to={`/stories/${file.story_id}`}
                                            >
                                                {t('viewStory')}
                                            </Link>
                                        )}
                                    </div>

                                    <MediaRating
                                        fileId={file.id}
                                        ownerId={file.user_id}
                                    />

                                    <CommentsSection
                                        targetType="file"
                                        targetId={file.id}
                                    />
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>

            {preview && (
                <div
                    className={styles.lightbox}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) {
                            setPreview(null);
                        }
                    }}
                >
                    <div
                        className={styles.lightboxPanel}
                        role="dialog"
                        aria-modal="true"
                        aria-label={preview.file_name}
                    >
                        <button
                            className={styles.lightboxClose}
                            type="button"
                            onClick={() => setPreview(null)}
                            aria-label={t('closePreview')}
                        >
                            ×
                        </button>

                        <img
                            className={styles.lightboxImage}
                            src={preview.url}
                            alt={preview.file_name}
                        />

                        <p>{preview.file_name}</p>
                    </div>
                </div>
            )}
        </main>
    );
}

export default GalleryPage;