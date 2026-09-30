import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
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
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'members', key);
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
                    setError(t('loadError'));
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
                    <p className={styles.eyebrow}>{t('kicker')}</p>
                    <h1>{t('title')}</h1>
                    <p>{t('intro')}</p>
                </header>

                {loading && <LoadingSpinner label={t('loading')} />}

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && profiles.length === 0 && (
                    <div className={styles.message}>{t('empty')}</div>
                )}

                {!loading && !error && profiles.length > 0 && (
                    <section className={styles.memberGrid} aria-label={t('directoryLabel')}>
                        {profiles.map((profile) => {
                            const avatarUrl = getProfileAvatarUrl(profile);
                            const displayName = profile.display_name || t('defaultName');
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
                                        <span className={styles.memberLabel}>{t('profileLabel')}</span>
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
                                                || t('defaultBio')}
                                        </p>
                                        <span className={styles.detailsLink}>{t('viewProfile')}</span>
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
