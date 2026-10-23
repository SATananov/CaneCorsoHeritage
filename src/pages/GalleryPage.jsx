import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import CatalogToolbar from '../components/CatalogToolbar';
import CatalogEmptyState from '../components/CatalogEmptyState';
import CatalogResultSummary from '../components/CatalogResultSummary';
import CommentsSection from '../components/CommentsSection';
import OwnerFileEditModal from '../components/OwnerFileEditModal';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaRating from '../components/MediaRating';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import { getTranslation } from '../i18n/translations';
import { getMediaTypeLabel } from '../i18n/mediaTypeLabels';
import { getOwnerFileEditUi } from '../i18n/ownerFileEditUi';
import {
    createMemberDownloadUrl,
    enrichCommunityMediaWithMetrics,
    fetchCommunityMediaFiles,
} from '../services/fileService';
import { isDocumentCategoryFile } from '../utils/fileCategories';
import styles from './GalleryPage.module.css';

const MEDIA_FILTERS = {
    ALL: 'all',
    IMAGES: 'images',
    AUDIO: 'audio',
    VIDEO: 'video',
    STORIES: 'stories',
    DOCUMENTS: 'documents',
};

const GALLERY_FILTERS = [
    MEDIA_FILTERS.ALL,
    MEDIA_FILTERS.IMAGES,
    MEDIA_FILTERS.AUDIO,
    MEDIA_FILTERS.VIDEO,
    MEDIA_FILTERS.STORIES,
];

const PAGE_SIZE = 9;

const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME: 'name',
    TOP_RATED: 'top-rated',
    MOST_COMMENTED: 'most-commented',
};

function isStoryTextFile(file) {
    if (!file.story_id) return false;

    const mimeType = file.mime_type ?? '';
    const fileName = file.file_name?.toLowerCase() ?? '';

    return mimeType.startsWith('text/')
        || fileName.endsWith('.txt')
        || fileName.endsWith('.md');
}

function getMediaType(file) {
    const mimeType = file.mime_type ?? '';

    if (isDocumentCategoryFile(file)) return MEDIA_FILTERS.DOCUMENTS;
    if (mimeType.startsWith('image/')) return MEDIA_FILTERS.IMAGES;
    if (mimeType.startsWith('audio/')) return MEDIA_FILTERS.AUDIO;
    if (mimeType.startsWith('video/')) return MEDIA_FILTERS.VIDEO;
    if (isStoryTextFile(file)) return MEDIA_FILTERS.STORIES;

    return MEDIA_FILTERS.DOCUMENTS;
}

function getRelatedMediaFile(file, files) {
    if (!isStoryTextFile(file) || !file.story_id) return null;

    const priority = {
        [MEDIA_FILTERS.IMAGES]: 0,
        [MEDIA_FILTERS.AUDIO]: 1,
        [MEDIA_FILTERS.VIDEO]: 2,
        [MEDIA_FILTERS.DOCUMENTS]: 3,
    };

    return files
        .filter((candidate) => (
            candidate.id !== file.id
            && candidate.story_id === file.story_id
            && !isStoryTextFile(candidate)
            && Boolean(candidate.url)
        ))
        .sort((a, b) => (
            (priority[getMediaType(a)] ?? Number.MAX_SAFE_INTEGER)
            - (priority[getMediaType(b)] ?? Number.MAX_SAFE_INTEGER)
        ))[0] ?? null;
}

function getRelatedMediaTranslationKey(file) {
    const mediaType = getMediaType(file);

    if (mediaType === MEDIA_FILTERS.IMAGES) return 'viewRelatedImage';
    if (mediaType === MEDIA_FILTERS.AUDIO) return 'listenRelatedAudio';
    if (mediaType === MEDIA_FILTERS.VIDEO) return 'viewRelatedVideo';

    return 'openRelatedDocument';
}

function isImageDocument(file) {
    return isDocumentCategoryFile(file)
        && (file.mime_type ?? '').startsWith('image/')
        && Boolean(file.url);
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
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'gallery', key),
        [language],
    );

    const tf = useCallback(
        (key) => getTranslation(language, 'myFiles', key),
        [language],
    );

    const [files, setFiles] = useState([]);
    const [downloadingFileId, setDownloadingFileId] = useState(null);
    const [downloadErrorFileId, setDownloadErrorFileId] = useState(null);
    const [editFile, setEditFile] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const requestedFilter = searchParams.get('type');
    const activeFilter = GALLERY_FILTERS.includes(requestedFilter)
        ? requestedFilter
        : MEDIA_FILTERS.ALL;

    const searchTerm = searchParams.get('search') ?? '';

    const requestedSort = searchParams.get('sort');
    const sortMode = Object.values(SORT_OPTIONS).includes(requestedSort)
        ? requestedSort
        : SORT_OPTIONS.NEWEST;

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('grid');

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
        const galleryFiles = files.filter(
            (file) => getMediaType(file) !== MEDIA_FILTERS.DOCUMENTS,
        );

        const counts = {
            [MEDIA_FILTERS.ALL]: galleryFiles.length,
            [MEDIA_FILTERS.IMAGES]: 0,
            [MEDIA_FILTERS.AUDIO]: 0,
            [MEDIA_FILTERS.VIDEO]: 0,
            [MEDIA_FILTERS.STORIES]: 0,
        };

        galleryFiles.forEach((file) => {
            counts[getMediaType(file)] += 1;
        });

        return counts;
    }, [files]);

    const visibleFiles = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLocaleLowerCase(language);

        const filtered = files.filter((file) => {
            const mediaType = getMediaType(file);

            if (mediaType === MEDIA_FILTERS.DOCUMENTS) return false;

            const matchesCategory = activeFilter === MEDIA_FILTERS.ALL
                || mediaType === activeFilter;

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
                const aRatingAvailable = a.averageRating != null && a.ratingCount != null;
                const bRatingAvailable = b.averageRating != null && b.ratingCount != null;

                if (aRatingAvailable !== bRatingAvailable) {
                    return bRatingAvailable ? 1 : -1;
                }

                if (aRatingAvailable && bRatingAvailable) {
                    const ratingDiff = Number(b.averageRating) - Number(a.averageRating);
                    if (ratingDiff !== 0) return ratingDiff;

                    const countDiff = Number(b.ratingCount) - Number(a.ratingCount);
                    if (countDiff !== 0) return countDiff;
                }
            }

            if (sortMode === SORT_OPTIONS.MOST_COMMENTED) {
                const aCommentsAvailable = a.commentCount != null;
                const bCommentsAvailable = b.commentCount != null;

                if (aCommentsAvailable !== bCommentsAvailable) {
                    return bCommentsAvailable ? 1 : -1;
                }

                if (aCommentsAvailable && bCommentsAvailable) {
                    const commentDiff = Number(b.commentCount) - Number(a.commentCount);
                    if (commentDiff !== 0) return commentDiff;
                }
            }

            const aTime = new Date(a.created_at ?? 0).getTime();
            const bTime = new Date(b.created_at ?? 0).getTime();

            return sortMode === SORT_OPTIONS.OLDEST ? aTime - bTime : bTime - aTime;
        });
    }, [activeFilter, files, language, searchTerm, sortMode]);

    const totalPages = Math.max(1, Math.ceil(visibleFiles.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pagedFiles = visibleFiles.slice(pageStart, pageStart + PAGE_SIZE);
    const filters = [
        [MEDIA_FILTERS.ALL, t('filterAll')],
        [MEDIA_FILTERS.IMAGES, t('filterImages')],
        [MEDIA_FILTERS.AUDIO, t('filterAudio')],
        [MEDIA_FILTERS.VIDEO, t('filterVideo')],
        [MEDIA_FILTERS.STORIES, t('filterStories')],
    ];

    async function downloadHandler(file) {
        setDownloadErrorFileId(null);
        setDownloadingFileId(file.id);

        try {
            const downloadUrl = await createMemberDownloadUrl(file);
            window.location.assign(downloadUrl);
        } catch {
            setDownloadErrorFileId(file.id);
        } finally {
            setDownloadingFileId(null);
        }
    }
    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.heading}>
                    <p className="section-kicker">{t('communityGallery')}</p>

                    <div className={styles.titleRow}>
                        <h1>{t('title')}</h1>

                        <div
                            className={styles.viewToggle}
                            role="group"
                            aria-label={t('viewMode')}
                        >
                            <button
                                aria-label={t('gridView')}
                                aria-pressed={viewMode === 'grid'}
                                className={viewMode === 'grid' ? styles.viewButtonActive : styles.viewButton}
                                type="button"
                                onClick={() => {
                                    setViewMode('grid');
                                    setCurrentPage(1);
                                }}
                                title={t('gridView')}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="6" height="6" rx="1" />
                                    <rect x="14" y="4" width="6" height="6" rx="1" />
                                    <rect x="4" y="14" width="6" height="6" rx="1" />
                                    <rect x="14" y="14" width="6" height="6" rx="1" />
                                </svg>
                            </button>

                            <button
                                aria-label={t('listView')}
                                aria-pressed={viewMode === 'list'}
                                className={viewMode === 'list' ? styles.viewButtonActive : styles.viewButton}
                                type="button"
                                onClick={() => {
                                    setViewMode('list');
                                    setCurrentPage(1);
                                }}
                                title={t('listView')}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <line x1="8" y1="6" x2="20" y2="6" />
                                    <line x1="8" y1="12" x2="20" y2="12" />
                                    <line x1="8" y1="18" x2="20" y2="18" />
                                    <circle cx="4" cy="6" r="1" />
                                    <circle cx="4" cy="12" r="1" />
                                    <circle cx="4" cy="18" r="1" />
                                </svg>
                            </button>
                        </div>
                    </div>

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
                                setCurrentPage(1);
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
                        setCurrentPage(1);
                    }}
                    sortLabel={t('sortLabel')}
                    sortValue={sortMode}
                    onSortChange={(value) => {
                        updateSearchParams({
                            sort: value === SORT_OPTIONS.NEWEST
                                ? null
                                : value,
                        });
                        setCurrentPage(1);
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
                    <CatalogResultSummary
                        label={t('results')}
                        count={visibleFiles.length}
                    />
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
                    <section
                        className={viewMode === 'list'
                            ? `${styles.grid} ${styles.listView}`
                            : styles.grid}
                        aria-label={t('title')}
                    >
                        {pagedFiles.map((file) => {
                            const mediaType = getMediaType(file);
                            const relatedMedia = isStoryTextFile(file)
                                ? getRelatedMediaFile(file, files)
                                : null;

                            return (
                                <article
                                    className={viewMode === 'list'
                                        ? `${styles.card} ${styles.cardList}`
                                        : styles.card}
                                    key={file.id}
                                >
                                    <div className={styles.mediaFrame}>
                                        <span className={styles.mediaBadge}>
                                            {getMediaTypeLabel(
                                                language,
                                                mediaType === MEDIA_FILTERS.IMAGES
                                                    ? 'image'
                                                    : mediaType === MEDIA_FILTERS.VIDEO
                                                        ? 'video'
                                                        : mediaType === MEDIA_FILTERS.AUDIO
                                                            ? 'audio'
                                                            : mediaType === MEDIA_FILTERS.STORIES
                                                                ? 'story'
                                                                : 'document',
                                            )}
                                        </span>
                                        {(mediaType === MEDIA_FILTERS.IMAGES || isImageDocument(file)) && file.url ? (
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
                                                <span className={styles.mediaTypeLabel}>{getMediaTypeLabel(language, 'audio')}</span>
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
                                                <span>{mediaType === MEDIA_FILTERS.STORIES
                                                    ? getMediaTypeLabel(language, 'story')
                                                    : getDocumentLabel(file)}</span>
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
                                            <span>
                                                {'★'} {file.averageRating == null
                                                    ? '—'
                                                    : Number(file.averageRating).toFixed(1)}
                                                {' '}({file.ratingCount == null ? '—' : file.ratingCount})
                                            </span>
                                            <span>
                                                {t('commentsMetric')}: {file.commentCount == null ? '—' : file.commentCount}
                                            </span>
                                        </div>

                                        <div className={styles.actionSlot}>
                                            {file.story_id && !isStoryTextFile(file) && (
                                                <Link
                                                    className={styles.storyLink}
                                                    to={`/stories/${file.story_id}`}
                                                >
                                                    {t('viewStory')}
                                                </Link>
                                            )}

                                            {relatedMedia && (
                                                <a
                                                    className={styles.storyLink}
                                                    href={relatedMedia.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {t(getRelatedMediaTranslationKey(relatedMedia))}
                                                </a>
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

                                            {user && (
                                                file.user_id === user.id
                                                || file.allow_member_download === true
                                            ) && (
                                                <button
                                                    className={styles.downloadFileLink}
                                                    type="button"
                                                    disabled={downloadingFileId === file.id}
                                                    onClick={() => downloadHandler(file)}
                                                >
                                                    {downloadingFileId === file.id
                                                        ? tf('downloading')
                                                        : tf('download')}
                                                </button>
                                            )}

                                            {file.user_id === user?.id && (
                                                <button
                                                    className={styles.editFileButton}
                                                    type="button"
                                                    onClick={() => setEditFile(file)}
                                                >
                                                    {getOwnerFileEditUi(language).edit}
                                                </button>
                                            )}

                                            {downloadErrorFileId === file.id && (
                                                <span className={styles.downloadError}>
                                                    {tf('downloadError')}
                                                </span>
                                            )}
                                        </div>

                                        <div className={styles.ratingBlock}>
                                            <MediaRating
                                                fileId={file.id}
                                                ownerId={file.user_id}
                                            />
                                        </div>

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

                {!loading && !error && totalPages > 1 && (
                    <nav className={styles.pagination} aria-label={t('paginationLabel')}>
                        <button
                            type="button"
                            disabled={safePage === 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        >
                            {t('previousPage')}
                        </button>

                        <div className={styles.pageNumbers}>
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    aria-current={page === safePage ? 'page' : undefined}
                                    className={page === safePage ? styles.pageButtonActive : undefined}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={safePage === totalPages}
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        >
                            {t('nextPage')}
                        </button>
                    </nav>
                )}
            </div>

            {editFile && (
                <OwnerFileEditModal
                    file={editFile}
                    onClose={() => setEditFile(null)}
                    onSaved={(updated) => {
                        setFiles((current) => (
                            updated.visibility === 'community'
                            && updated.moderation_status === 'approved'
                                ? current.map((item) => (
                                    item.id === updated.id ? { ...item, ...updated } : item
                                ))
                                : current.filter((item) => item.id !== updated.id)
                        ));
                    }}
                />
            )}

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
