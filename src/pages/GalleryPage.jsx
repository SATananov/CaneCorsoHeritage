import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import CommentsSection from '../components/CommentsSection';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaRating from '../components/MediaRating';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchCommunityMediaFiles } from '../services/fileService';
import styles from './GalleryPage.module.css';

const MEDIA_FILTERS = {
    ALL: 'all',
    IMAGES: 'images',
    AUDIO: 'audio',
    VIDEO: 'video',
    DOCUMENTS: 'documents',
};

function getMediaType(file) {
    const mimeType = file.mime_type ?? '';

    if (mimeType.startsWith('image/')) return MEDIA_FILTERS.IMAGES;
    if (mimeType.startsWith('audio/')) return MEDIA_FILTERS.AUDIO;
    if (mimeType.startsWith('video/')) return MEDIA_FILTERS.VIDEO;

    return MEDIA_FILTERS.DOCUMENTS;
}

function getDocumentLabel(file) {
    const mimeType = file.mime_type ?? '';
    const fileName = file.file_name?.toLowerCase() ?? '';

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'PDF';
    if (
        mimeType === 'application/msword'
        || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || fileName.endsWith('.doc')
        || fileName.endsWith('.docx')
    ) return 'DOC';

    if (
        mimeType === 'application/vnd.oasis.opendocument.text'
        || fileName.endsWith('.odt')
    ) return 'ODT';

    if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) return 'TXT';

    return 'FILE';
}

function GalleryPage() {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'gallery', key),
        [language],
    );

    const [files, setFiles] = useState([]);
    const [activeFilter, setActiveFilter] = useState(MEDIA_FILTERS.ALL);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadGallery() {
            setLoading(true);
            setError('');

            try {
                const data = await fetchCommunityMediaFiles({
                    signal: controller.signal,
                });

                if (active && !controller.signal.aborted) {
                    setFiles(data);
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

    const visibleFiles = useMemo(
        () => activeFilter === MEDIA_FILTERS.ALL
            ? files
            : files.filter((file) => getMediaType(file) === activeFilter),
        [activeFilter, files],
    );

    const filters = [
        [MEDIA_FILTERS.ALL, t('filterAll')],
        [MEDIA_FILTERS.IMAGES, t('filterImages')],
        [MEDIA_FILTERS.AUDIO, t('filterAudio')],
        [MEDIA_FILTERS.VIDEO, t('filterVideo')],
        [MEDIA_FILTERS.DOCUMENTS, t('filterDocuments')],
    ];

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.heading}>
                    <p className="section-kicker">{t('communityGallery')}</p>
                    <h1>{t('title')}</h1>
                    <p>{t('intro')}</p>
                </header>

                <div className={styles.filters} aria-label={t('filterLabel')}>
                    {filters.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={
                                activeFilter === value
                                    ? `${styles.filterButton} ${styles.filterButtonActive}`
                                    : styles.filterButton
                            }
                            aria-pressed={activeFilter === value}
                            onClick={() => setActiveFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {loading && <LoadingSpinner label={t('loading')} />}

                {!loading && error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && visibleFiles.length === 0 && (
                    <div className={styles.message}>
                        {activeFilter === MEDIA_FILTERS.ALL
                            ? t('empty')
                            : t('emptyCategory')}
                    </div>
                )}

                {!loading && !error && visibleFiles.length > 0 && (
                    <section className={styles.grid} aria-label={t('title')}>
                        {visibleFiles.map((file) => {
                            const mediaType = getMediaType(file);

                            return (
                                <article className={styles.card} key={file.id}>
                                    <div className={styles.mediaFrame}>
                                        {mediaType === MEDIA_FILTERS.IMAGES && file.url ? (
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
                                        ) : mediaType === MEDIA_FILTERS.AUDIO && file.url ? (
                                            <div className={styles.audioPreview}>
                                                <span className={styles.mediaTypeLabel}>AUDIO</span>
                                                <audio controls preload="metadata" src={file.url}>
                                                    {t('audioUnsupported')}
                                                </audio>
                                            </div>
                                        ) : mediaType === MEDIA_FILTERS.VIDEO && file.url ? (
                                            <video
                                                className={styles.videoPreview}
                                                controls
                                                preload="metadata"
                                                src={file.url}
                                            >
                                                {t('videoUnsupported')}
                                            </video>
                                        ) : (
                                            <div className={styles.documentPreview}>
                                                <span>{getDocumentLabel(file)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.cardBody}>
                                        <strong className={styles.fileName}>
                                            {file.file_name}
                                        </strong>

                                        <div className={styles.actionSlot}>
                                            {file.story_id && (
                                                <Link
                                                    className={styles.storyLink}
                                                    to={`/stories/${file.story_id}`}
                                                >
                                                    {t('viewStory')}
                                                </Link>
                                            )}

                                            {file.url && (
                                                <a
                                                    className={styles.openFileLink}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {t('openFile')}
                                                </a>
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
                            );
                        })}
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