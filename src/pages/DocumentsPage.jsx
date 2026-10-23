import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
    enrichCommunityMediaWithMetrics,
    fetchCommunityMediaFiles,
} from '../services/fileService';
import { isDocumentCategoryFile } from '../utils/fileCategories';
import styles from './DocumentsPage.module.css';

const PAGE_SIZE = 9;

const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME: 'name',
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

function isDocument(file) {
    if (isDocumentCategoryFile(file)) return true;

    const mimeType = file.mime_type ?? '';

    return !isStoryTextFile(file)
        && !mimeType.startsWith('image/')
        && !mimeType.startsWith('audio/')
        && !mimeType.startsWith('video/');
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
    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
    }

    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}

function DocumentsPage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'documents', key),
        [language],
    );

    const [files, setFiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState(SORT_OPTIONS.NEWEST);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('grid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editFile, setEditFile] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadDocuments() {
            setLoading(true);
            setError('');

            try {
                const media = await fetchCommunityMediaFiles({
                    signal: controller.signal,
                });

                const documents = media.filter(isDocument);

                const enriched = await enrichCommunityMediaWithMetrics(
                    documents,
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

        loadDocuments();

        return () => {
            active = false;
            controller.abort();
        };
    }, [t]);

    const visibleFiles = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLocaleLowerCase(language);

        const filtered = files.filter((file) => {
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

            if (sortMode === SORT_OPTIONS.MOST_COMMENTED) {
                const aCommentsAvailable = a.commentCount != null;
                const bCommentsAvailable = b.commentCount != null;

                if (aCommentsAvailable !== bCommentsAvailable) {
                    return bCommentsAvailable ? 1 : -1;
                }

                if (aCommentsAvailable && bCommentsAvailable) {
                    const commentDiff = Number(b.commentCount)
                        - Number(a.commentCount);

                    if (commentDiff !== 0) return commentDiff;
                }
            }

            const aTime = new Date(a.created_at ?? 0).getTime();
            const bTime = new Date(b.created_at ?? 0).getTime();

            return sortMode === SORT_OPTIONS.OLDEST
                ? aTime - bTime
                : bTime - aTime;
        });
    }, [files, language, searchTerm, sortMode]);

    const totalPages = Math.max(1, Math.ceil(visibleFiles.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pagedFiles = visibleFiles.slice(pageStart, pageStart + PAGE_SIZE);

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.heading}>
                    <p className="section-kicker">{t('kicker')}</p>

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

                <CatalogToolbar
                    searchLabel={t('searchLabel')}
                    searchPlaceholder={t('searchPlaceholder')}
                    searchValue={searchTerm}
                    onSearchChange={(value) => {
                        setSearchTerm(value);
                        setCurrentPage(1);
                    }}
                    sortLabel={t('sortLabel')}
                    sortValue={sortMode}
                    onSortChange={(value) => {
                        setSortMode(value);
                        setCurrentPage(1);
                    }}
                    sortOptions={[
                        { value: SORT_OPTIONS.NEWEST, label: t('sortNewest') },
                        { value: SORT_OPTIONS.OLDEST, label: t('sortOldest') },
                        { value: SORT_OPTIONS.NAME, label: t('sortName') },
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
                        message={searchTerm.trim() ? t('noSearchResults') : t('empty')}
                    />
                )}

                {!loading && !error && pagedFiles.length > 0 && (
                    <section
                        className={viewMode === 'list'
                            ? `${styles.grid} ${styles.listView}`
                            : styles.grid}
                        aria-label={t('title')}
                    >
                        {pagedFiles.map((file) => (
                            <article
                                className={viewMode === 'list'
                                    ? `${styles.card} ${styles.cardList}`
                                    : styles.card}
                                key={file.id}
                            >
                                <div className={styles.documentPreview}>
                                    <span className={styles.mediaBadge}>
                                        {getMediaTypeLabel(language, 'document')}
                                    </span>
                                    {isImageDocument(file) ? (
                                        <a
                                            className={styles.imageDocumentLink}
                                            href={file.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`${t('openFile')}: ${file.file_name}`}
                                        >
                                            <img
                                                className={styles.imageDocumentPreview}
                                                src={file.url}
                                                alt={file.file_name}
                                            />
                                        </a>
                                    ) : (
                                        <span>{getDocumentLabel(file)}</span>
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

                                    <div className={styles.metrics}>
                                        <span>
                                            {t('commentsMetric')}: {file.commentCount == null ? '—' : file.commentCount}
                                        </span>
                                    </div>

                                    <div className={styles.actions}>
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

                                        {file.user_id === user?.id && (
                                            <button
                                                className={styles.editFileButton}
                                                type="button"
                                                onClick={() => setEditFile(file)}
                                            >
                                                    {getOwnerFileEditUi(language).edit}
                                                </button>
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
                        ))}
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
        </main>
    );
}

export default DocumentsPage;
