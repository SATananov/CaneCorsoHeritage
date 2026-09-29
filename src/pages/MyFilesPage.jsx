import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import useAuth from '../hooks/useAuth';
import {
    deleteUserFile,
    fetchMyFiles,
    updateUserFileVisibility,
    uploadUserFiles,
} from '../services/fileService';
import styles from './MyFilesPage.module.css';

function formatSize(bytes) {
    if (!bytes) {
        return '';
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MyFilesPage() {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [visibility, setVisibility] = useState('private');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadFiles() {
            try {
                const data = await fetchMyFiles(user.id);

                if (active) {
                    setFiles(data);
                }
            } catch (loadError) {
                if (active) {
                    setError(loadError.message || 'Unable to load your files.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadFiles();

        return () => {
            active = false;
        };
    }, [user.id]);

    async function refreshFiles() {
        const data = await fetchMyFiles(user.id);
        setFiles(data);
    }

    async function uploadHandler(event) {
        event.preventDefault();
        const form = event.currentTarget;

        if (selectedFiles.length === 0) {
            setError('Choose at least one file.');
            return;
        }

        try {
            setUploading(true);
            setError('');
            await uploadUserFiles(selectedFiles, { visibility });
            await refreshFiles();
            setSelectedFiles([]);
            form.reset();
        } catch (uploadError) {
            setError(uploadError.message || 'Unable to upload the selected files.');
        } finally {
            setUploading(false);
        }
    }

    async function visibilityHandler(file) {
        const nextVisibility = file.visibility === 'community' ? 'private' : 'community';

        try {
            setError('');
            await updateUserFileVisibility(file.id, nextVisibility);
            await refreshFiles();
        } catch (updateError) {
            setError(updateError.message || 'Unable to change file visibility.');
        }
    }

    async function deleteHandler(file) {
        try {
            setError('');
            await deleteUserFile(file);
            await refreshFiles();
        } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete this file.');
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <section className={styles.heading}>
                    <div>
                        <p className="section-kicker">Private area</p>
                        <h1>My Files</h1>
                        <p>
                            Upload images, MP4 or TXT files. Keep them private or share them with the Community.
                        </p>
                    </div>
                </section>

                <form className={styles.uploadPanel} onSubmit={uploadHandler}>
                    <label>
                        Choose files
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/mp4,text/plain,.txt"
                            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                            disabled={uploading}
                        />
                    </label>

                    <label>
                        Visibility
                        <select
                            value={visibility}
                            onChange={(event) => setVisibility(event.target.value)}
                            disabled={uploading}
                        >
                            <option value="private">My Own — private</option>
                            <option value="community">Community — public</option>
                        </select>
                    </label>

                    <button type="submit" disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload Files'}
                    </button>
                </form>

                <p className={styles.fileHint}>Images, MP4 and TXT · up to 50 MB per file</p>

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {loading && <LoadingSpinner label="Loading your files..." />}

                {!loading && files.length === 0 && (
                    <div className={styles.message}>No files in your account yet.</div>
                )}

                {!loading && files.length > 0 && (
                    <section className={styles.grid} aria-label="Your files">
                        {files.map((file) => (
                            <article className={styles.card} key={file.id}>
                                {file.mime_type?.startsWith('image/') && file.url ? (
                                    <img className={styles.preview} src={file.url} alt="" />
                                ) : (
                                    <div className={styles.fileType}>
                                        {file.mime_type === 'video/mp4' ? 'MP4' : 'TXT'}
                                    </div>
                                )}

                                <div className={styles.cardBody}>
                                    <p className={styles.visibility}>
                                        {file.visibility === 'community' ? 'Community · Public' : 'My Own · Private'}
                                    </p>
                                    <h2>{file.file_name}</h2>
                                    <p>
                                        {formatSize(file.file_size)}
                                        {file.story_id ? ' · Attached to a Story' : ''}
                                    </p>

                                    <div className={styles.actions}>
                                        {file.url && (
                                            <a href={file.url} target="_blank" rel="noreferrer">
                                                Open
                                            </a>
                                        )}

                                        <label
                                            className={`${styles.publicCheck}${file.story_id ? ` ${styles.publicCheckDisabled}` : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={file.visibility === 'community'}
                                                disabled={Boolean(file.story_id)}
                                                onChange={() => visibilityHandler(file)}
                                            />
                                            <span>Public</span>
                                        </label>

                                        {file.story_id && (
                                            <span className={styles.storyVisibility}>
                                                Visibility follows Story
                                            </span>
                                        )}

                                        <button
                                            className={styles.deleteButton}
                                            type="button"
                                            onClick={() => deleteHandler(file)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}

export default MyFilesPage;
