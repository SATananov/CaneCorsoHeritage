import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileEditor from '../components/ProfileEditor';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import MediaRating from '../components/MediaRating';
import CommentsSection from '../components/CommentsSection';
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

function formatMemberSince(value, language) {
    if (!value) {
        return '';
    }

    const locale = language === 'bg' ? 'bg-BG' : language === 'it' ? 'it-IT' : 'en-GB';

    return new Intl.DateTimeFormat(locale, {
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
    const t = useCallback((key) => getTranslation(language, 'memberProfile', key), [language]);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user, roleLoading, isActive } = useAuth();
    const [profile, setProfile] = useState(null);
    const [stories, setStories] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [publicContact, setPublicContact] = useState(null);
    const [privateDetails, setPrivateDetails] = useState(null);
    const [privateDetailsLoaded, setPrivateDetailsLoaded] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loadIdentity, setLoadIdentity] = useState({ userId, viewerId: user?.id, refreshKey });

    // Reset before children commit when the requested member or viewer changes.
    if (
        loadIdentity.userId !== userId
        || loadIdentity.viewerId !== user?.id
        || loadIdentity.refreshKey !== refreshKey
    ) {
        setLoadIdentity({ userId, viewerId: user?.id, refreshKey });
        setLoading(true);
        setError('');
        setProfile(null);
        setStories([]);
        setSharedFiles([]);
        setPublicContact(null);
        setPrivateDetails(null);
        setPrivateDetailsLoaded(false);
    }

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadProfile = async () => {
            try {
                const profileData = await fetchProfileById(
                    userId,
                    { signal: controller.signal },
                );

                if (!active || controller.signal.aborted) {
                    return;
                }

                if (!profileData) {
                    setError('notFound');
                    return;
                }

                setProfile(profileData);

                if (user?.id === profileData.id && !roleLoading && isActive) {
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

                if (!active || controller.signal.aborted) {
                    return;
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
                if (loadError.name !== 'AbortError' && active && !controller.signal.aborted) {
                    setError('loadError');
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
    }, [isActive, refreshKey, roleLoading, user?.id, userId]);

    // Hide the previous route's state even before the new effect runs.
    const isCurrentMember = loadIdentity.userId === userId;

    const displayName = profile?.display_name || t('defaultMember');
    const avatarUrl = getProfileAvatarUrl(profile);
    const memberSince = formatMemberSince(profile?.created_at, language);
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
        && !roleLoading
        && isActive
        && privateDetailsLoaded
        && missingRequiredFields.length > 0
    );

    return (
        <main className={styles.page}>
            <div className={styles.detailsShell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/users')}>
                    {t('back')}
                </button>

                {(loading || !isCurrentMember) && <LoadingSpinner label={t('loading')} />}

                {isCurrentMember && error && (
                    <div className={styles.message} role="alert">
                        {t(error)}
                    </div>
                )}

                {isCurrentMember && profile && (
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
                                <p className={styles.eyebrow}>{t('profile')}</p>
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
                                            ? t('ownBioSetup')
                                            : isOwnProfile
                                                ? t('ownBioEmpty')
                                                : t('memberBioEmpty'))}
                                </p>
                                {memberSince && (
                                    <p className={styles.memberSince}>{format('memberSince', { date: memberSince })}</p>
                                )}
                            </div>
                        </article>

                        {isOwnProfile && !roleLoading && isActive && (
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
                                <p className={styles.eyebrow}>{t('publishedWork')}</p>
                                <h2 id="member-stories-title">{format('storiesBy', { name: displayName })}</h2>
                            </div>

                            {stories.length === 0 ? (
                                <div className={styles.message}>{t('noStories')}</div>
                            ) : (
                                <div className={styles.storyGrid}>
                                    {stories.map((story) => (
                                        <article className={styles.storyCard} key={story.id}>
                                            <span>{story.eyebrow === 'Community' ? t('communityEyebrow') : story.eyebrow === 'My Own' ? t('privateEyebrow') : story.eyebrow || t('story')}</span>
                                            <h3>{story.title}</h3>
                                            <p>{story.description}</p>
                                            <Link to={`/stories/${story.id}`}>{t('viewStory')}</Link>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.storySection} aria-labelledby="member-files-title">
                            <div className={styles.sectionHeading}>
                                <p className={styles.eyebrow}>{t('sharedFiles')}</p>
                                <h2 id="member-files-title">{format('filesBy', { name: displayName })}</h2>
                            </div>

                            {sharedFiles.length === 0 ? (
                                <div className={styles.message}>{t('noFiles')}</div>
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
                                                        {t('audioUnsupported')}
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
                                                        {t('openFile')}
                                                    </a>
                                                )}

                                                {(file.mime_type?.startsWith('image/')
                                                    || file.mime_type?.startsWith('audio/')) && (
                                                    <MediaRating
                                                        fileId={file.id}
                                                        ownerId={file.user_id}
                                                    />
                                                )}

                                                <CommentsSection
                                                    targetType="file"
                                                    targetId={file.id}
                                                />
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
