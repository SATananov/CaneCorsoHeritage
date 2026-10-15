import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import {
    acceptFriendRequest,
    deleteFriendship,
    fetchFriendOverview,
    fetchFriendshipWithMember,
    sendFriendRequest,
} from '../services/friendshipService';
import { getFriendshipTranslation } from '../i18n/friendshipTranslations';
import styles from './FriendshipSection.module.css';

const EMPTY_OVERVIEW = {
    friends: [],
    incoming: [],
    outgoing: [],
};

function memberPath(profile) {
    return profile?.username
        ? `/members/${encodeURIComponent(profile.username)}`
        : '#';
}

function memberName(profile, fallback) {
    return profile?.display_name?.trim()
        || (profile?.username ? `@${profile.username}` : fallback);
}

function FriendRow({ item, t, actions, busy }) {
    const profile = item.profile;
    const path = memberPath(profile);

    return (
        <div className={styles.friendRow}>
            <div className={styles.friendIdentity}>
                {path === '#' ? (
                    <strong>{memberName(profile, t('memberFallback'))}</strong>
                ) : (
                    <Link to={path}>{memberName(profile, t('memberFallback'))}</Link>
                )}
                {profile?.username && (
                    <span>@{profile.username}</span>
                )}
            </div>

            <div className={styles.rowActions}>
                {actions.map((action) => (
                    <button
                        className={action.secondary ? styles.secondaryButton : styles.actionButton}
                        disabled={busy}
                        key={action.key}
                        type="button"
                        onClick={action.onClick}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FriendshipSection({ profileId, isOwnProfile }) {
    const { language } = useLanguage();
    const { user, roleLoading, isActive } = useAuth();
    const t = (key) => getFriendshipTranslation(language, key);

    const [relationship, setRelationship] = useState(null);
    const [overview, setOverview] = useState(EMPTY_OVERVIEW);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const canUseFriends = Boolean(user?.id && !roleLoading && isActive);

    useEffect(() => {
        if (!canUseFriends || !profileId) {
            return undefined;
        }

        const controller = new AbortController();
        let active = true;

        async function loadFriendshipData() {
            setLoading(true);
            setLoadError(false);

            try {
                if (isOwnProfile) {
                    const result = await fetchFriendOverview(
                        user.id,
                        { signal: controller.signal },
                    );

                    if (active && !controller.signal.aborted) {
                        setOverview(result);
                        setRelationship(null);
                    }
                } else {
                    const result = await fetchFriendshipWithMember(
                        user.id,
                        profileId,
                        { signal: controller.signal },
                    );

                    if (active && !controller.signal.aborted) {
                        setRelationship(result);
                        setOverview(EMPTY_OVERVIEW);
                    }
                }
            } catch (error) {
                if (
                    active
                    && !controller.signal.aborted
                    && error?.name !== 'AbortError'
                ) {
                    setLoadError(true);
                }
            } finally {
                if (active && !controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadFriendshipData();

        return () => {
            active = false;
            controller.abort();
        };
    }, [canUseFriends, isOwnProfile, profileId, refreshKey, user?.id]);

    if (!canUseFriends) {
        return null;
    }

    async function runAction(action) {
        setBusy(true);
        setActionError(false);

        try {
            await action();
            setRefreshKey((value) => value + 1);
        } catch {
            setActionError(true);
        } finally {
            setBusy(false);
        }
    }

    function removeAction(item, label = t('removeFriend')) {
        return {
            key: `remove-${item.id}`,
            label,
            secondary: true,
            onClick: () => runAction(() => deleteFriendship(item.id)),
        };
    }

    if (!isOwnProfile) {
        const isOutgoingPending = (
            relationship?.status === 'pending'
            && relationship.requester_id === user.id
        );
        const isIncomingPending = (
            relationship?.status === 'pending'
            && relationship.addressee_id === user.id
        );
        const isAccepted = relationship?.status === 'accepted';

        return (
            <section className={styles.compactSection} aria-labelledby="friendship-profile-title">
                <div>
                    <p className={styles.kicker}>{t('kicker')}</p>
                    <h2 id="friendship-profile-title">{t('title')}</h2>
                </div>

                {loading ? (
                    <span className={styles.status}>{t('loading')}</span>
                ) : loadError ? (
                    <span className={styles.error} role="alert">{t('loadError')}</span>
                ) : (
                    <div className={styles.profileActions}>
                        {!relationship && (
                            <button
                                className={styles.actionButton}
                                disabled={busy}
                                type="button"
                                onClick={() => runAction(() => (
                                    sendFriendRequest(user.id, profileId)
                                ))}
                            >
                                {t('addFriend')}
                            </button>
                        )}

                        {isOutgoingPending && (
                            <>
                                <span className={styles.status}>{t('requestSent')}</span>
                                <button
                                    className={styles.secondaryButton}
                                    disabled={busy}
                                    type="button"
                                    onClick={() => runAction(() => deleteFriendship(relationship.id))}
                                >
                                    {t('cancelRequest')}
                                </button>
                            </>
                        )}

                        {isIncomingPending && (
                            <>
                                <button
                                    className={styles.actionButton}
                                    disabled={busy}
                                    type="button"
                                    onClick={() => runAction(() => acceptFriendRequest(relationship.id))}
                                >
                                    {t('accept')}
                                </button>
                                <button
                                    className={styles.secondaryButton}
                                    disabled={busy}
                                    type="button"
                                    onClick={() => runAction(() => deleteFriendship(relationship.id))}
                                >
                                    {t('decline')}
                                </button>
                            </>
                        )}

                        {isAccepted && (
                            <>
                                <span className={styles.friendBadge}>{t('friends')}</span>
                                <button
                                    className={styles.secondaryButton}
                                    disabled={busy}
                                    type="button"
                                    onClick={() => runAction(() => deleteFriendship(relationship.id))}
                                >
                                    {t('removeFriend')}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {actionError && (
                    <span className={styles.error} role="alert">{t('actionError')}</span>
                )}
            </section>
        );
    }

    return (
        <section className={styles.section} aria-labelledby="my-friends-title">
            <div className={styles.heading}>
                <p className={styles.kicker}>{t('kicker')}</p>
                <h2 id="my-friends-title">{t('title')}</h2>
                <p>{t('intro')}</p>
            </div>

            {loading ? (
                <div className={styles.message}>{t('loading')}</div>
            ) : loadError ? (
                <div className={styles.errorMessage} role="alert">{t('loadError')}</div>
            ) : (
                <div className={styles.columns}>
                    <div className={styles.listBlock}>
                        <h3>{t('incomingTitle')} <span>{overview.incoming.length}</span></h3>
                        {overview.incoming.length === 0 ? (
                            <p className={styles.empty}>{t('noIncoming')}</p>
                        ) : overview.incoming.map((item) => (
                            <FriendRow
                                busy={busy}
                                item={item}
                                key={item.id}
                                t={t}
                                actions={[
                                    {
                                        key: `accept-${item.id}`,
                                        label: t('accept'),
                                        onClick: () => runAction(() => acceptFriendRequest(item.id)),
                                    },
                                    {
                                        key: `decline-${item.id}`,
                                        label: t('decline'),
                                        secondary: true,
                                        onClick: () => runAction(() => deleteFriendship(item.id)),
                                    },
                                ]}
                            />
                        ))}
                    </div>

                    <div className={styles.listBlock}>
                        <h3>{t('myFriendsTitle')} <span>{overview.friends.length}</span></h3>
                        {overview.friends.length === 0 ? (
                            <p className={styles.empty}>{t('noFriends')}</p>
                        ) : overview.friends.map((item) => (
                            <FriendRow
                                busy={busy}
                                item={item}
                                key={item.id}
                                t={t}
                                actions={[removeAction(item)]}
                            />
                        ))}
                    </div>

                    <div className={styles.listBlock}>
                        <h3>{t('outgoingTitle')} <span>{overview.outgoing.length}</span></h3>
                        {overview.outgoing.length === 0 ? (
                            <p className={styles.empty}>{t('noOutgoing')}</p>
                        ) : overview.outgoing.map((item) => (
                            <FriendRow
                                busy={busy}
                                item={item}
                                key={item.id}
                                t={t}
                                actions={[removeAction(item, t('cancelRequest'))]}
                            />
                        ))}
                    </div>
                </div>
            )}

            {actionError && (
                <div className={styles.errorMessage} role="alert">{t('actionError')}</div>
            )}
        </section>
    );
}

export default FriendshipSection;
