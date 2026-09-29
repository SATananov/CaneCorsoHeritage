import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    fetchProfiles,
    fetchPublicContacts,
    getProfileAvatarUrl,
} from '../services/profileService';
import identityStyles from './MemberIdentity.module.css';
import styles from './UserProfiles.module.css';

function getInitial(displayName) {
    return displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function UsersPage() {
    const [profiles, setProfiles] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadProfiles = async () => {
            try {
                const [profileData, contactData] = await Promise.all([
                    fetchProfiles({ signal: controller.signal }),
                    fetchPublicContacts({ signal: controller.signal }),
                ]);

                setProfiles(profileData);
                setContacts(contactData);
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
                            const contact = contacts.find(
                                (item) => item.user_id === profile.id,
                            );

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
                                        <span className={identityStyles.username}>
                                            @{profile.username}
                                        </span>
                                        {contact?.email && (
                                            <span className={identityStyles.email}>
                                                {contact.email}
                                            </span>
                                        )}
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
