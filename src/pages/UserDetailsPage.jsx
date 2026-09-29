import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchCommunityFilesByUser } from '../services/fileService';
import {
    fetchProfileById,
    fetchPublishedStoriesByAuthor,
    getProfileAvatarUrl,
} from '../services/profileService';
import styles from './UserProfiles.module.css';

function getInitial(displayName) {
    return displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function formatMemberSince(value) {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(value));
}

function getSharedFileLabel(file) {
    if (file.mime_type?.startsWith('audio/')) {
        return 'AUDIO';
    }

    if (file.mime_type === 'video/mp4') {
        return 'MP4';
    }

    if (file.mime_type === 'application/pdf') {
        return 'PDF';
    }

    if (
        file.mime_type === 'application/msword'
        || file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || file.mime_type === 'application/vnd.oasis.opendocument.text'
    ) {
        return 'DOC';
    }

    return 'TEXT';
}

function UserDetailsPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stories, setStories] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadProfile = async () => {
            try {
                const [profileData, storyData, fileData] = await Promise.all([
                    fetchProfileById(userId, { signal: controller.signal }),
                    fetchPublishedStoriesByAuthor(userId, { signal: controller.signal }),
                    fetchCommunityFilesByUser(userId),
                ]);

                if (!profileData) {
                    setError('This member profile could not be found.');
                    return;
                }

                if (active) {
                    setProfile(profileData);
                    setStories(storyData);
                    setSharedFiles(fileData);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError('Unable to load this member profile right now.');
                }
            } finally {
                if (active && !controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            active = false;
            controller.abort();
        };
    }, [userId]);

    const displayName = profile?.display_name || 'USG Member';
    const avatarUrl = getProfileAvatarUrl(profile);
    const memberSince = formatMemberSince(profile?.created_at);

    return (
        <main className={styles.page}>
            <div className={styles.detailsShell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/users')}>
                    ← Back to Members
                </button>

                {loading && <LoadingSpinner label="Loading member profile..." />}

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {profile && (
                    <>
                        <article className={styles.profileCard}>
                            <div className={`${styles.avatar} ${styles.profileAvatar}`} aria-hidden="true">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="" />
                                ) : (
                                    <span>{getInitial(displayName)}</span>
                                )}
                            </div>

                            <div className={styles.profileCopy}>
                                <p className={styles.eyebrow}>Member profile</p>
                                <h1>{displayName}</h1>
                                <p className={styles.bio}>
                                    {profile.bio?.trim()
                                        || 'This member has not added a public biography yet.'}
                                </p>
                                {memberSince && (
                                    <p className={styles.memberSince}>Member since {memberSince}</p>
                                )}
                            </div>
                        </article>

                        <section className={styles.storySection} aria-labelledby="member-stories-title">
                            <div className={styles.sectionHeading}>
                                <p className={styles.eyebrow}>Published work</p>
                                <h2 id="member-stories-title">Stories by {displayName}</h2>
                            </div>

                            {stories.length === 0 ? (
                                <div className={styles.message}>No published stories from this member yet.</div>
                            ) : (
                                <div className={styles.storyGrid}>
                                    {stories.map((story) => (
                                        <article className={styles.storyCard} key={story.id}>
                                            <span>{story.eyebrow || 'Story'}</span>
                                            <h3>{story.title}</h3>
                                            <p>{story.description}</p>
                                            <Link to={`/stories/${story.id}`}>View story →</Link>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.storySection} aria-labelledby="member-files-title">
                            <div className={styles.sectionHeading}>
                                <p className={styles.eyebrow}>Shared files</p>
                                <h2 id="member-files-title">Public files by {displayName}</h2>
                            </div>

                            {sharedFiles.length === 0 ? (
                                <div className={styles.message}>No public files from this member yet.</div>
                            ) : (
                                <div className={styles.fileGrid}>
                                    {sharedFiles.map((file) => (
                                        <article className={styles.fileCard} key={file.id}>
                                            {file.mime_type?.startsWith('image/') && file.url ? (
                                                <img src={file.url} alt="" />
                                            ) : file.mime_type?.startsWith('audio/') && file.url ? (
                                                <div className={styles.sharedAudio}>
                                                    <span>AUDIO</span>
                                                    <audio controls preload="metadata" src={file.url}>
                                                        Your browser does not support audio playback.
                                                    </audio>
                                                </div>
                                            ) : (
                                                <div className={styles.fileType}>
                                                    {getSharedFileLabel(file)}
                                                </div>
                                            )}

                                            <div>
                                                <strong>{file.file_name}</strong>
                                                {file.url && (
                                                    <a href={file.url} target="_blank" rel="noreferrer">
                                                        Open file →
                                                    </a>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

export default UserDetailsPage;
