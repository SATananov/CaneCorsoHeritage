import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import CatalogToolbar from '../components/CatalogToolbar';
import CatalogEmptyState from '../components/CatalogEmptyState';
import CommentsSection from '../components/CommentsSection';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaRating from '../components/MediaRating';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import {
    enrichCommunityMediaWithMetrics,
    fetchCommunityMediaFiles,
} from '../services/fileService';
import styles from './GalleryPage.module.css';

const MEDIA_FILTERS = {
    ALL: 'all',
    IMAGES: 'images',
    AUDIO: 'audio',
    VIDEO: 'video',
    DOCUMENTS: 'documents',
};

const PAGE_SIZE = 9;

const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME: 'name',
    TOP_RATED: 'top-rated',
    MOST_COMMENTED: 'most-commented',
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

function formatFileSize(size) {
    const bytes = Number(size ?? 0);

    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;

    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;

    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}
function GalleryPage() {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'gallery', key),
        [language],
    );

    const [files, setFiles] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();

    const requestedFilter = searchParams.get('type');
    const activeFilter = Object.values(MEDIA_FILTERS).includes(requestedFilter)
        ? requestedFilter
        : MEDIA_FILTERS.ALL;

    const searchTerm = searchParams.get('search') ?? '';

    const requestedSort = searchParams.get('sort');
    const sortMode = Object.values(SORT_OPTIONS).includes(requestedSort)
        ? requestedSort
        : SORT_OPTIONS.NEWEST;

    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const updateSearchParams = useCallback((changes) => {
        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            for (const [key, value] of Object.entries(changes)) {
                if (value === null || value === undefined || value === '') {
                    nextParams.delete(key);
                } else {
                    nextParams.set(key, value);
                }
            }

            return nextParams;
        }, { replace: true });
    }, [setSearchParams]);
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

                const enriched = await enrichCommunityMediaWithMetrics(
                    data,
                    { signal: controller.signal },
                );

                if (active && !controller.signal.aborted) {
                    setFiles(enriched);
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

    const categoryCounts = useMemo(() => {
        const counts = {
            [MEDIA_FILTERS.ALL]: files.length,
            [MEDIA_FILTERS.IMAGES]: 0,
            [MEDIA_FILTERS.AUDIO]: 0,
            [MEDIA_FILTERS.VIDEO]: 0,
            [MEDIA_FILTERS.DOCUMENTS]: 0,
        };

        files.forEach((file) => {
            counts[getMediaType(file)] += 1;
        });

        return counts;
    }, [files]);

    const visibleFiles = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLocaleLowerCase(language);

        const filtered = files.filter((file) => {
            const matchesCategory = activeFilter === MEDIA_FILTERS.ALL
                || getMediaType(file) === activeFilter;

            if (!matchesCategory) return false;
            if (!normalizedSearch) return true;

            return (file.file_name ?? '')
                .toLocaleLowerCase(language)
                .includes(normalizedSearch);
        });

        return [...filtered].sort((a, b) => {
            if (sortMode === SORT_OPTIONS.NAME) {
                return (a.file_name ?? '').localeCompare(
                    b.file_name ?? '',
                    language,
                    { sensitivity: 'base' },
                );
            }

            if (sortMode === SORT_OPTIONS.TOP_RATED) {
                const ratingDiff = Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0);
                if (ratingDiff !== 0) return ratingDiff;

                const countDiff = Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0);
                if (countDiff !== 0) return countDiff;
            }

            if (sortMode === SORT_OPTIONS.MOST_COMMENTED) {
                const commentDiff = Number(b.commentCount ?? 0) - Number(a.commentCount ?? 0);
                if (commentDiff !== 0) return commentDiff;
            }

            const aTime = new Date(a.created_at ?? 0).getTime();
            const bTime = new Date(b.created_at ?? 0).getTime();

            return sortMode === SORT_OPTIONS.OLDEST ? aTime - bTime : bTime - aTime;
        });
    }, [activeFilter, files, language, searchTerm, sortMode]);

    const pagedFiles = visibleFiles.slice(0, visibleCount);
    const hasMore = visibleCount < visibleFiles.length;
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
                            onClick={() => {
                                updateSearchParams({
                                    type: value === MEDIA_FILTERS.ALL ? null : value,
                                });
                                setVisibleCount(PAGE_SIZE);
                            }}
                        >
                            <span>{label}</span>
                            <span className={styles.filterCount}>{categoryCounts[value]}</span>
                        </button>
                    ))}
                </div>

                <CatalogToolbar
                    searchLabel={t('searchLabel')}
                    searchPlaceholder={t('searchPlaceholder')}
                    searchValue={searchTerm}
                    onSearchChange={(value) => {
                        updateSearchParams({
                            search: value || null,
                        });
                        setVisibleCount(PAGE_SIZE);
                    }}
                    sortLabel={t('sortLabel')}
                    sortValue={sortMode}
                    onSortChange={(value) => {
                        updateSearchParams({
                            sort: value === SORT_OPTIONS.NEWEST
                                ? null
                                : value,
                        });
                        setVisibleCount(PAGE_SIZE);
                    }}
                    sortOptions={[
                        { value: SORT_OPTIONS.NEWEST, label: t('sortNewest') },
                        { value: SORT_OPTIONS.OLDEST, label: t('sortOldest') },
                        { value: SORT_OPTIONS.NAME, label: t('sortName') },
                        { value: SORT_OPTIONS.TOP_RATED, label: t('sortTopRated') },
                        { value: SORT_OPTIONS.MOST_COMMENTED, label: t('sortMostCommented') },
                    ]}
                />
                {!loading && !error && (
                    <p className={styles.resultSummary} aria-live="polite">
                        {t('results')}: {visibleFiles.length}
                    </p>
                )}

                {loading && <LoadingSpinner label={t('loading')} />}

                {!loading && error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && visibleFiles.length === 0 && (
                    <CatalogEmptyState
                        className={styles.message}
                        message={
                            searchTerm.trim()
                                ? t('noSearchResults')
                                : activeFilter === MEDIA_FILTERS.ALL
                                    ? t('empty')
                                    : t('emptyCategory')
                        }
                    />
                )}

                {!loading && !error && visibleFiles.length > 0 && (
                    <section className={styles.grid} aria-label={t('title')}>
                        {pagedFiles.map((file) => {
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

                                        <div className={styles.fileMeta}>
                                            <span>{file.mime_type || t('unknownType')}</span>
                                            {formatFileSize(file.file_size) && (
                                                <span>{formatFileSize(file.file_size)}</span>
                                            )}
                                        </div>

                                        <div className={styles.catalogMetrics} aria-label={t('metricsLabel')}>
                                            <span>{'★'} {Number(file.averageRating ?? 0).toFixed(1)} {' '}({file.ratingCount ?? 0})</span>
                                            <span>{t('commentsMetric')}: {file.commentCount ?? 0}</span>
                                        </div>

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

                                        {mediaType !== MEDIA_FILTERS.DOCUMENTS && (
                                            <MediaRating
                                                fileId={file.id}
                                                ownerId={file.user_id}
                                            />
                                        )}

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

                {!loading && !error && hasMore && (
                    <div className={styles.loadMoreWrap}>
                        <button
                            type="button"
                            className={styles.loadMoreButton}
                            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                        >
                            {t('loadMore')}
                        </button>
                        <span className={styles.loadMoreStatus}>
                            {t('showing')} {Math.min(visibleCount, visibleFiles.length)} / {visibleFiles.length}
                        </span>
                    </div>
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