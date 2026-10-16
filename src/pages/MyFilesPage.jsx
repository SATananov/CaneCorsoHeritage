import { useCallback, useEffect, useRef, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import CommentsSection from '../components/CommentsSection';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import { getTranslation } from '../i18n/translations';
import {
    deleteUserFile,
    fetchMyFiles,
    updateUserFileVisibility,
    updateUserFileDownloadPermission,
    uploadUserFiles,
} from '../services/fileService';
import { isDocumentCategoryFile } from '../utils/fileCategories';
import styles from './MyFilesPage.module.css';

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(file) {
    if (file.mime_type?.startsWith('audio/')) return 'AUDIO';
    if (file.mime_type === 'video/mp4') return 'MP4';
    if (file.mime_type === 'application/pdf') return 'PDF';
    if (
        file.mime_type === 'application/msword'
        || file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || file.mime_type === 'application/vnd.oasis.opendocument.text'
    ) return 'DOC';
    return 'TEXT';
}


function isStoryTextFile(file) {
    if (!file.story_id) return false;

    const mimeType = file.mime_type ?? '';
    const fileName = file.file_name?.toLowerCase() ?? '';

    return mimeType.startsWith('text/')
        || fileName.endsWith('.txt')
        || fileName.endsWith('.md');
}

function isDocumentFile(file) {
    if (isDocumentCategoryFile(file)) return true;

    const mimeType = file.mime_type ?? '';

    return !isStoryTextFile(file)
        && !mimeType.startsWith('image/')
        && !mimeType.startsWith('audio/')
        && !mimeType.startsWith('video/');
}

function MyFilesPage({ mode = 'all' } = {}) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const translationSection = mode === 'documents' ? 'myDocuments' : 'myFiles';
    const t = useCallback((key) => {
        const value = getTranslation(language, translationSection, key);
        return mode === 'documents' && value === key
            ? getTranslation(language, 'myFiles', key)
            : value;
    }, [language, mode, translationSection]);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const [files, setFiles] = useState([]);
    const visibleFiles = mode === 'documents' ? files.filter(isDocumentFile) : files;
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [visibility, setVisibility] = useState('private');
    const [allowMemberDownload, setAllowMemberDownload] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [zoomedImage, setZoomedImage] = useState(null);
    const uploadingRef = useRef(false);
    const fileLoadRequestRef = useRef(0);
    const mountedRef = useRef(false);
    const currentUserIdRef = useRef(user.id);
    const previousFileUserIdRef = useRef(user.id);
    const uploadBatchRef = useRef({ userId: null, completed: new WeakSet() });

    useEffect(() => {
        currentUserIdRef.current = user.id;
    }, [user.id]);

    function getFileVisibilityLabel(file) {
        if (file.visibility === 'private') return t('privateStatus');
        switch (file.moderation_status) {
            case 'pending': return t('pendingStatus');
            case 'rejected': return t('rejectedStatus');
            case 'hidden': return t('hiddenStatus');
            default: return t('approvedStatus');
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            fileLoadRequestRef.current += 1;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const requestUserId = user.id;
        const requestId = ++fileLoadRequestRef.current;
        const userChanged = previousFileUserIdRef.current !== requestUserId;

        previousFileUserIdRef.current = requestUserId;

        if (userChanged) {
            setFiles([]);
            setError('');
            setLoading(true);
        }

        async function loadFiles() {
            try {
                const data = await fetchMyFiles(requestUserId);
                if (
                    active
                    && mountedRef.current
                    && currentUserIdRef.current === requestUserId
                    && requestId === fileLoadRequestRef.current
                ) {
                    setFiles(data);
                }
            } catch {
                if (
                    active
                    && mountedRef.current
                    && currentUserIdRef.current === requestUserId
                    && requestId === fileLoadRequestRef.current
                ) {
                    setError(t('loadError'));
                }
            } finally {
                if (
                    active
                    && mountedRef.current
                    && currentUserIdRef.current === requestUserId
                    && requestId === fileLoadRequestRef.current
                ) {
                    setLoading(false);
                }
            }
        }

        loadFiles();
        return () => { active = false; };
    }, [t, user.id]);

    useEffect(() => {
        if (!zoomedImage) return undefined;
        const previousOverflow = document.body.style.overflow;
        function closeOnEscape(event) {
            if (event.key === 'Escape') setZoomedImage(null);
        }
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [zoomedImage]);

    async function refreshFiles() {
        const requestUserId = user.id;
        const requestId = ++fileLoadRequestRef.current;

        try {
            const data = await fetchMyFiles(requestUserId);

            if (
                mountedRef.current
                && currentUserIdRef.current === requestUserId
                && requestId === fileLoadRequestRef.current
            ) {
                setFiles(data);
            }
        } finally {
            if (
                mountedRef.current
                && currentUserIdRef.current === requestUserId
                && requestId === fileLoadRequestRef.current
            ) {
                setLoading(false);
            }
        }
    }

    async function uploadHandler(event) {
        event.preventDefault();
        if (uploadingRef.current) return;
        const form = event.currentTarget;
        if (selectedFiles.length === 0) {
            setError(t('chooseError'));
            return;
        }
        if (uploadBatchRef.current.userId !== user.id) {
            uploadBatchRef.current = { userId: user.id, completed: new WeakSet() };
        }
        const batch = uploadBatchRef.current;
        let uploadsComplete = false;
        uploadingRef.current = true;
        try {
            setUploading(true);
            setError('');
            // File references survive retries. A newly selected File is a new
            // upload, even if its name/size match a previous selection.
            for (const file of selectedFiles) {
                if (batch.completed.has(file)) continue;
                await uploadUserFiles([file], {
                    visibility,
                    allowMemberDownload,
                    contentCategory: mode === 'documents' ? 'document' : null,
                });
                batch.completed.add(file);
            }
            uploadsComplete = true;
            await refreshFiles();
            setSelectedFiles([]);
            setAllowMemberDownload(false);
            form.reset();
            uploadBatchRef.current = { userId: user.id, completed: new WeakSet() };
        } catch {
            // Keep completion tracking when a list refresh fails, too.
            setError(t(uploadsComplete ? 'loadError' : 'uploadError'));
        } finally {
            uploadingRef.current = false;
            setUploading(false);
        }
    }

    async function visibilityHandler(file) {
        const nextVisibility = file.visibility === 'community' ? 'private' : 'community';
        setError('');

        try {
            await updateUserFileVisibility(file.id, nextVisibility);
        } catch {
            setError(t('visibilityError'));
            return;
        }

        // The mutation is committed even if the reconciliation read fails.
        setFiles((current) => current.map((item) => (
            item.id === file.id
                ? {
                    ...item,
                    visibility: nextVisibility,
                    moderation_status: nextVisibility === 'community' ? 'pending' : 'approved',
                    moderated_at: null,
                    moderated_by: null,
                }
                : item
        )));

        try {
            await refreshFiles();
        } catch {
            setError(t('loadError'));
        }
    }

    async function downloadPermissionHandler(file) {
        const nextValue = file.allow_member_download !== true;
        setError('');

        try {
            await updateUserFileDownloadPermission(file.id, nextValue);
        } catch {
            setError(t('downloadPermissionError'));
            return;
        }

        setFiles((current) => current.map((item) => (
            item.id === file.id
                ? {
                    ...item,
                    allow_member_download: nextValue,
                }
                : item
        )));

        try {
            await refreshFiles();
        } catch {
            setError(t('loadError'));
        }
    }
    async function deleteHandler(file) {
        setError('');

        let deletionResult;

        try {
            deletionResult = await deleteUserFile(file);
        } catch {
            setError(t('deleteError'));
            return;
        }

        // Keep committed deletion visible even when the follow-up read fails.
        setFiles((current) => current.filter((item) => item.id !== file.id));

        try {
            await refreshFiles();
        } catch {
            setError(t(deletionResult?.cleanupPending ? 'deleteCleanupLoadWarning' : 'loadError'));
            return;
        }

        if (deletionResult?.cleanupPending) {
            setError(t('deleteCleanupWarning'));
        }
    }

    useEffect(() => {
        if (loading || files.length === 0) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const hash = window.location.hash;

        if (!hash.startsWith('#file-')) {
            return;
        }

        const element = document.getElementById(hash.slice(1));

        if (!element) {
            return;
        }

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        });
    }, [files, loading]);
    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <section className={styles.heading}>
                    <div>
                        <p className="section-kicker">{t('privateArea')}</p>
                        <h1>{t('title')}</h1>
                        <p>{t('intro')}</p>
                    </div>
                </section>

                <form className={styles.uploadPanel} onSubmit={uploadHandler}>
                    <div className={styles.fileUploadField}>
                        <span className={styles.fileUploadLabel}>
                            {t('chooseFiles')}
                        </span>

                        <div className={styles.filePickerRow}>
                            <label
                                className={`${styles.filePickerTrigger}${uploading ? ` ${styles.filePickerDisabled}` : ''}`}
                            >
                                <input
                                    className={styles.fileInput}
                                    type="file"
                                    multiple
                                    accept={mode === 'documents'
                                        ? "image/*,.txt,.md,.csv,.tsv,.json,.xml,.rtf,.pdf,.doc,.docx,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/*"
                                        : "image/*,audio/*,video/mp4,text/*,.txt,.md,.csv,.tsv,.json,.xml,.rtf,.pdf,.doc,.docx,.odt"}
                                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                                    disabled={uploading}
                                />

                                <span>{t('chooseFiles')}</span>
                            </label>

                            <div className={styles.filePickerDisplay}>
                                {selectedFiles.length > 0
                                    ? selectedFiles.map((file) => file.name).join(', ')
                                    : ''}
                            </div>
                        </div>
                    </div>

                    <label>
                        {t('visibility')}
                        <select value={visibility} onChange={(event) => setVisibility(event.target.value)} disabled={uploading}>
                            <option value="private">{t('private')}</option>
                            <option value="community">{t('community')}</option>
                        </select>
                    </label>

                    <button type="submit" disabled={uploading}>{uploading ? t('uploading') : t('upload')}</button>
                    <label className={`${styles.publicCheck} ${styles.downloadPermissionUpload}`}>
                        <input
                            type="checkbox"
                            checked={allowMemberDownload}
                            onChange={(event) => setAllowMemberDownload(event.target.checked)}
                            disabled={uploading}
                        />
                        <span>{t('allowMemberDownload')}</span>
                    </label>
                </form>

                <p className={styles.fileHint}>{t('fileHint')}</p>
                {error && <div className={styles.message} role="alert">{error}</div>}
                {loading && <LoadingSpinner label={t('loading')} />}
                {!loading && visibleFiles.length === 0 && <div className={styles.message}>{t('empty')}</div>}

                {!loading && visibleFiles.length > 0 && (
                    <section className={styles.grid} aria-label={t('filesLabel')}>
                        {visibleFiles.map((file) => (
                            <article className={styles.card} id={`file-${file.id}`} key={file.id}>
                                {file.mime_type?.startsWith('image/') && file.url ? (
                                    <button className={styles.previewButton} type="button" onClick={() => setZoomedImage(file)} aria-label={format('zoomFile', { name: file.file_name })}>
                                        <img className={styles.preview} src={file.url} alt={file.file_name} />
                                        <span className={styles.zoomLabel}>{t('zoom')}</span>
                                    </button>
                                ) : file.mime_type?.startsWith('audio/') && file.url ? (
                                    <div className={styles.audioPreview}>
                                        <span>AUDIO</span>
                                        <audio controls preload="metadata" src={file.url}>{t('audioUnsupported')}</audio>
                                    </div>
                                ) : (
                                    <div className={styles.fileType}>{getFileTypeLabel(file)}</div>
                                )}

                                <div className={styles.cardBody}>
                                    <p className={styles.visibility}>{getFileVisibilityLabel(file)}</p>
                                    <h2>{file.file_name}</h2>
                                    <p>{formatSize(file.file_size)}{file.story_id ? ` · ${t('attachedToStory')}` : ''}</p>

                                    <div className={styles.actions}>
                                        {file.url && <a href={file.url} target="_blank" rel="noreferrer">{t('open')}</a>}
                                        <label className={`${styles.publicCheck}${file.story_id ? ` ${styles.publicCheckDisabled}` : ''}`}>
                                            <input type="checkbox" checked={file.visibility === 'community'} disabled={Boolean(file.story_id)} onChange={() => visibilityHandler(file)} />
                                            <span>{t('public')}</span>
                                        </label>
                                        <label className={styles.publicCheck}>
                                            <input
                                                type="checkbox"
                                                checked={file.allow_member_download === true}
                                                onChange={() => downloadPermissionHandler(file)}
                                            />
                                            <span>{t('memberDownload')}</span>
                                        </label>
                                        {file.story_id && <span className={styles.storyVisibility}>{t('followsStory')}</span>}
                                        <button className={styles.deleteButton} type="button" onClick={() => deleteHandler(file)}>{t('delete')}</button>
                                    </div>
                                </div>

                                <CommentsSection
                                    targetType="file"
                                    targetId={file.id}
                                />
                            </article>
                        ))}
                    </section>
                )}
            </div>

            {zoomedImage && (
                <div className={styles.lightbox} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setZoomedImage(null); }}>
                    <div className={styles.lightboxPanel} role="dialog" aria-modal="true" aria-label={zoomedImage.file_name}>
                        <button className={styles.lightboxClose} type="button" onClick={() => setZoomedImage(null)} aria-label={t('closePreview')}>×</button>
                        <img className={styles.lightboxImage} src={zoomedImage.url} alt={zoomedImage.file_name} />
                        <p>{zoomedImage.file_name}</p>
                    </div>
                </div>
            )}
        </main>
    );
}

export default MyFilesPage;
