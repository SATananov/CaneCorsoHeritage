import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import CatalogToolbar from '../components/CatalogToolbar';
import CatalogEmptyState from '../components/CatalogEmptyState';
import CatalogLoadMore from '../components/CatalogLoadMore';
import CommentsSection from '../components/CommentsSection';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import {
    enrichCommunityMediaWithMetrics,
    fetchCommunityMediaFiles,
} from '../services/fileService';
import styles from './DocumentsPage.module.css';

const PAGE_SIZE = 9;

const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME: 'name',
    MOST_COMMENTED: 'most-commented',
};

function isDocument(file) {
    const mimeType = file.mime_type ?? '';

    return !mimeType.startsWith('image/')
        && !mimeType.startsWith('audio/')
        && !mimeType.startsWith('video/');
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
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'documents', key),
        [language],
    );

    const [files, setFiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState(SORT_OPTIONS.NEWEST);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                const commentDiff = Number(b.commentCount ?? 0)
                    - Number(a.commentCount ?? 0);

                if (commentDiff !== 0) return commentDiff;
            }

            const aTime = new Date(a.created_at ?? 0).getTime();
            const bTime = new Date(b.created_at ?? 0).getTime();

            return sortMode === SORT_OPTIONS.OLDEST
                ? aTime - bTime
                : bTime - aTime;
        });
    }, [files, language, searchTerm, sortMode]);

    const pagedFiles = visibleFiles.slice(0, visibleCount);
    const hasMore = visibleCount < visibleFiles.length;

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.heading}>
                    <p className="section-kicker">{t('kicker')}</p>
                    <h1>{t('title')}</h1>
                    <p>{t('intro')}</p>
                </header>

                <CatalogToolbar
                    searchLabel={t('searchLabel')}
                    searchPlaceholder={t('searchPlaceholder')}
                    searchValue={searchTerm}
                    onSearchChange={(value) => {
                        setSearchTerm(value);
                        setVisibleCount(PAGE_SIZE);
                    }}
                    sortLabel={t('sortLabel')}
                    sortValue={sortMode}
                    onSortChange={(value) => {
                        setSortMode(value);
                        setVisibleCount(PAGE_SIZE);
                    }}
                    sortOptions={[
                        { value: SORT_OPTIONS.NEWEST, label: t('sortNewest') },
                        { value: SORT_OPTIONS.OLDEST, label: t('sortOldest') },
                        { value: SORT_OPTIONS.NAME, label: t('sortName') },
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
                        message={searchTerm.trim() ? t('noSearchResults') : t('empty')}
                    />
                )}

                {!loading && !error && pagedFiles.length > 0 && (
                    <section className={styles.grid} aria-label={t('title')}>
                        {pagedFiles.map((file) => (
                            <article className={styles.card} key={file.id}>
                                <div className={styles.documentPreview}>
                                    <span>{getDocumentLabel(file)}</span>
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
                                            {t('commentsMetric')}: {file.commentCount ?? 0}
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

                {!loading && !error && hasMore && (
                    <CatalogLoadMore
                        label={t('loadMore')}
                        statusLabel={t('showing')}
                        visibleCount={visibleCount}
                        totalCount={visibleFiles.length}
                        onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    />
                )}
            </div>
        </main>
    );
}

export default DocumentsPage;