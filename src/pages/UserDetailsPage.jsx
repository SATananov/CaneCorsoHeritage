import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileEditor from '../components/ProfileEditor';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import MediaRating from '../components/MediaRating';
import { fetchCommunityFilesByUser } from '../services/fileService';
import {
    fetchOwnPrivateProfileDetails,
    fetchProfileById,
    fetchProfilePublicContact,
    fetchPublishedStoriesByAuthor,
    getProfileAvatarUrl,
} from '../services/profileService';
import identityStyles from './MemberIdentity.module.css';
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
    const { language } = useLanguage();
    const tCompletion = (key) => getTranslation(language, 'completion', key);
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [stories, setStories] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [publicContact, setPublicContact] = useState(null);
    const [privateDetails, setPrivateDetails] = useState(null);
    const [privateDetailsLoaded, setPrivateDetailsLoaded] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadProfile = async () => {
            try {
                const profileData = await fetchProfileById(
                    userId,
                    { signal: controller.signal },
                );

                if (!profileData) {
                    if (active) {
                        setError('This member profile could not be found.');
                    }
                    return;
                }

                if (!active || controller.signal.aborted) {
                    return;
                }

                setProfile(profileData);

                if (user?.id === profileData.id) {
                    try {
                        const details = await fetchOwnPrivateProfileDetails(
                            profileData.id,
                            { signal: controller.signal },
                        );

                        if (!controller.signal.aborted && active) {
                            setPrivateDetails(details);
                            setPrivateDetailsLoaded(true);
                        }
                    } catch (privateError) {
                        if (
                            !controller.signal.aborted
                            && privateError?.name !== 'AbortError'
                            && active
                        ) {
                            console.warn(
                                'Unable to verify required profile details.',
                                privateError,
                            );
                            setPrivateDetails(null);
                            setPrivateDetailsLoaded(true);
                        }
                    }
                }

                const [storiesResult, filesResult, contactResult] = await Promise.allSettled([
                    fetchPublishedStoriesByAuthor(
                        userId,
                        { signal: controller.signal },
                    ),
                    fetchCommunityFilesByUser(userId),
                    fetchProfilePublicContact(
                        userId,
                        { signal: controller.signal },
                    ),
                ]);

                if (!active || controller.signal.aborted) {
                    return;
                }

                setStories(
                    storiesResult.status === 'fulfilled'
                        ? storiesResult.value
                        : [],
                );

                setSharedFiles(
                    filesResult.status === 'fulfilled'
                        ? filesResult.value
                        : [],
                );

                setPublicContact(
                    contactResult.status === 'fulfilled'
                        ? contactResult.value
                        : null,
                );

                const secondaryErrors = [
                    storiesResult,
                    filesResult,
                    contactResult,
                ].filter((result) => result.status === 'rejected');

                if (secondaryErrors.length > 0) {
                    console.warn(
                        'Member profile loaded with incomplete secondary data.',
                        secondaryErrors.map((result) => result.reason),
                    );
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
    }, [user?.id, userId, refreshKey]);

    const displayName = profile?.display_name || 'USG Member';
    const avatarUrl = getProfileAvatarUrl(profile);
    const memberSince = formatMemberSince(profile?.created_at);
    const isOwnProfile = Boolean(user?.id && profile?.id === user.id);
    const missingRequiredFields = isOwnProfile && privateDetailsLoaded
        ? [
            ['first_name', 'firstName'],
            ['last_name', 'lastName'],
            ['country', 'country'],
            ['city', 'city'],
        ]
            .filter(([key]) => !privateDetails?.[key]?.trim())
            .map(([, labelKey]) => tCompletion(labelKey))
        : [];
    const profileSetupRequired = (
        isOwnProfile
        && privateDetailsLoaded
        && missingRequiredFields.length > 0
    );

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
                        {profileSetupRequired && (
                            <section
                                className={styles.profileSetupRequired}
                                aria-labelledby="profile-setup-required-title"
                            >
                                <p className={styles.profileSetupKicker}>
                                    {tCompletion('setupRequired')}
                                </p>
                                <h2 id="profile-setup-required-title">
                                    {tCompletion('setupTitle')}
                                </h2>
                                <p>
                                    {tCompletion('setupCopy')}
                                    {' '}
                                    {missingRequiredFields.join(', ')}.
                                    {tCompletion('setupLock')}
                                </p>
                                <strong>
                                    {tCompletion('setupAction')}
                                </strong>
                            </section>
                        )}

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
                                <p className={identityStyles.profileUsername}>
                                    @{profile.username}
                                </p>
                                {publicContact?.show_email && publicContact.email && (
                                    <p className={identityStyles.profileEmail}>
                                        {publicContact.email}
                                    </p>
                                )}
                                <p className={styles.bio}>
                                    {profile.bio?.trim()
                                        || (profileSetupRequired
                                            ? 'Your public biography is optional. Complete the required profile setup below first.'
                                            : isOwnProfile
                                                ? 'You have not added a public biography yet.'
                                                : 'This member has not added a public biography yet.')}
                                </p>
                                {memberSince && (
                                    <p className={styles.memberSince}>Member since {memberSince}</p>
                                )}
                            </div>
                        </article>

                        {user?.id === profile.id && (
                            <ProfileEditor
                                key={`${profile.id}-${profile.updated_at}-${publicContact?.updated_at || ''}`}
                                profile={profile}
                                contact={publicContact}
                                currentEmail={user.email}
                                requiredCompletion={profileSetupRequired}
                                onSaved={() => setRefreshKey((value) => value + 1)}
                            />
                        )}

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

                                                {(file.mime_type?.startsWith('image/')
                                                    || file.mime_type?.startsWith('audio/')) && (
                                                    <MediaRating
                                                        fileId={file.id}
                                                        ownerId={file.user_id}
                                                    />
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
