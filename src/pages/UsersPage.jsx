import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchProfiles, getProfileAvatarUrl } from '../services/profileService';
import styles from './UserProfiles.module.css';

function getInitial(displayName) {
    return displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function UsersPage() {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadProfiles = async () => {
            try {
                const data = await fetchProfiles({ signal: controller.signal });
                setProfiles(data);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setError('Unable to load the member directory right now.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfiles();

        return () => {
            controller.abort();
        };
    }, []);

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.pageHeader}>
                    <p className={styles.eyebrow}>USG community</p>
                    <h1>Members</h1>
                    <p>Meet the people who share stories, experience and Cane Corso heritage.</p>
                </header>

                {loading && <LoadingSpinner label="Loading members..." />}

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && profiles.length === 0 && (
                    <div className={styles.message}>No public member profiles yet.</div>
                )}

                {!loading && !error && profiles.length > 0 && (
                    <section className={styles.memberGrid} aria-label="Member directory">
                        {profiles.map((profile) => {
                            const avatarUrl = getProfileAvatarUrl(profile);
                            const displayName = profile.display_name || 'USG Member';

                            return (
                                <Link
                                    className={styles.memberCard}
                                    key={profile.id}
                                    to={`/users/${profile.id}`}
                                >
                                    <div className={styles.avatar} aria-hidden="true">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" />
                                        ) : (
                                            <span>{getInitial(displayName)}</span>
                                        )}
                                    </div>

                                    <div className={styles.memberCopy}>
                                        <span className={styles.memberLabel}>Member profile</span>
                                        <h2>{displayName}</h2>
                                        <p>
                                            {profile.bio?.trim()
                                                || 'Cane Corso Heritage community member.'}
                                        </p>
                                        <span className={styles.detailsLink}>View profile →</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </section>
                )}
            </div>
        </main>
    );
}

export default UsersPage;
