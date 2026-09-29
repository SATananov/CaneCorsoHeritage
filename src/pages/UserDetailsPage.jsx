import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
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

function UserDetailsPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const [profileData, storyData] = await Promise.all([
                    fetchProfileById(userId, { signal: controller.signal }),
                    fetchPublishedStoriesByAuthor(userId, { signal: controller.signal }),
                ]);

                if (!profileData) {
                    setError('This member profile could not be found.');
                    return;
                }

                setProfile(profileData);
                setStories(storyData);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setError('Unable to load this member profile right now.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
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
                    </>
                )}
            </div>
        </main>
    );
}

export default UserDetailsPage;
