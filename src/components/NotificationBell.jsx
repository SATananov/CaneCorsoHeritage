import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import {
    acceptFriendRequest,
    deleteFriendship,
    fetchFriendOverview,
} from '../services/friendshipService';
import {
    fetchUnreadMessageNotifications,
    openOrCreatePrivateConversation,
    subscribeToPrivateMessageChanges,
} from '../services/messageService';
import {
    fetchUnreadCommentNotifications,
    markCommentNotificationRead,
} from '../services/commentNotificationService';
import {
    fetchUnreadEngagementNotifications,
    markEngagementNotificationRead,
} from '../services/engagementNotificationService';
import { getNotificationTranslation } from '../i18n/notificationTranslations';
import styles from './NotificationBell.module.css';

const REFRESH_INTERVAL_MS = 30000;

function memberName(profile, fallback) {
    return profile?.display_name?.trim()
        || (profile?.username ? `@${profile.username}` : fallback);
}

function memberPath(profile) {
    return profile?.username
        ? `/members/${encodeURIComponent(profile.username)}`
        : null;
}

function AccordionSection({ count, expanded, id, onToggle, title, children }) {
    const panelId = `${id}-panel`;

    return (
        <section className={styles.accordionSection}>
            <button
                aria-controls={panelId}
                aria-expanded={expanded}
                className={styles.accordionTrigger}
                type="button"
                onClick={onToggle}
            >
                <span className={styles.accordionTitle}>
                    <span aria-hidden="true" className={styles.chevron}>
                        {expanded ? '⌄' : '›'}
                    </span>
                    {title}
                </span>
                <span className={count > 0 ? styles.sectionCountActive : styles.sectionCount}>
                    {count}
                </span>
            </button>

            {expanded && (
                <div className={styles.accordionPanel} id={panelId}>
                    {children}
                </div>
            )}
        </section>
    );
}

function NotificationBell() {
    const { language } = useLanguage();
    const { user, roleLoading, isActive } = useAuth();
    const t = useCallback(
        (key) => getNotificationTranslation(language, key),
        [language],
    );

    const rootRef = useRef(null);
    const notificationRequestRef = useRef(0);

    const [open, setOpen] = useState(false);
    const [incoming, setIncoming] = useState([]);
    const [friends, setFriends] = useState([]);
    const [messageNotifications, setMessageNotifications] = useState([]);
    const [commentNotifications, setCommentNotifications] = useState([]);
    const [engagementNotifications, setEngagementNotifications] = useState([]);
    const [loadedForUserId, setLoadedForUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [expanded, setExpanded] = useState({
        messages: null,
        friends: null,
        comments: null,
        engagements: null,
    });

    const canUseNotifications = Boolean(user?.id && !roleLoading && isActive);

    const loadNotifications = useCallback(async ({ silent = false } = {}) => {
        if (!canUseNotifications || !user?.id) {
            return;
        }

        const requestUserId = user.id;
        const requestId = notificationRequestRef.current + 1;
        notificationRequestRef.current = requestId;

        if (!silent) {
            setLoading(true);
        }

        setLoadError(false);

        try {
            const [
                overview,
                unreadMessages,
                unreadComments,
                unreadEngagements,
            ] = await Promise.all([
                fetchFriendOverview(requestUserId),
                fetchUnreadMessageNotifications(requestUserId),
                fetchUnreadCommentNotifications(requestUserId),
                fetchUnreadEngagementNotifications(requestUserId),
            ]);

            if (notificationRequestRef.current !== requestId) {
                return;
            }

            setIncoming(overview.incoming);
            setFriends(overview.friends);
            setMessageNotifications(unreadMessages);
            setCommentNotifications(unreadComments);
            setEngagementNotifications(unreadEngagements);
            setLoadedForUserId(requestUserId);
        } catch {
            if (notificationRequestRef.current === requestId) {
                setLoadError(true);
            }
        } finally {
            if (notificationRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [canUseNotifications, user]);

    useEffect(() => {
        if (!canUseNotifications) {
            return undefined;
        }

        let active = true;

        Promise.resolve().then(() => {
            if (active) {
                loadNotifications();
            }
        });

        const refresh = () => {
            if (active) {
                loadNotifications({ silent: true });
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };

        window.addEventListener('focus', refresh);
        window.addEventListener('cch:friendships-changed', refresh);
        window.addEventListener('cch:messages-changed', refresh);
        window.addEventListener('cch:messages-read', refresh);
        window.addEventListener('cch:comments-changed', refresh);
        window.addEventListener('cch:engagements-changed', refresh);
        document.addEventListener('visibilitychange', onVisibility);
        const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
        const unsubscribeMessages = subscribeToPrivateMessageChanges(
            user.id,
            (message) => {
                refresh();

                if (message) {
                    window.dispatchEvent(new CustomEvent(
                        'cch:realtime-message',
                        { detail: message },
                    ));
                }
            },
        );

        return () => {
            active = false;
            notificationRequestRef.current += 1;
            window.removeEventListener('focus', refresh);
            window.removeEventListener('cch:friendships-changed', refresh);
            window.removeEventListener('cch:messages-changed', refresh);
            window.removeEventListener('cch:messages-read', refresh);
            window.removeEventListener('cch:comments-changed', refresh);
            window.removeEventListener('cch:engagements-changed', refresh);
            document.removeEventListener('visibilitychange', onVisibility);
            window.clearInterval(intervalId);
            unsubscribeMessages();
        };
    }, [canUseNotifications, loadNotifications, user]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!canUseNotifications) {
        return null;
    }

    const ready = loadedForUserId === user.id;
    const visibleIncoming = ready ? incoming : [];
    const visibleFriends = ready ? friends : [];
    const visibleMessages = ready ? messageNotifications : [];
    const visibleComments = ready ? commentNotifications : [];
    const visibleEngagements = ready ? engagementNotifications : [];
    const unreadMessageCount = visibleMessages.reduce((sum, item) => sum + item.count, 0);
    const friendRequestCount = visibleIncoming.length;
    const commentCount = visibleComments.length;
    const engagementCount = visibleEngagements.length;
    const count = friendRequestCount
        + unreadMessageCount
        + commentCount
        + engagementCount;

    const isExpanded = (section, sectionCount) => (
        expanded[section] ?? sectionCount > 0
    );

    function toggleSection(section, sectionCount) {
        setExpanded((current) => {
            const currentValue = current[section] ?? sectionCount > 0;

            return {
                ...current,
                [section]: !currentValue,
            };
        });
    }

    async function handleAction(friendshipId, action) {
        setBusyId(friendshipId);
        setActionError(false);

        try {
            await action(friendshipId);
            await loadNotifications({ silent: true });
            window.dispatchEvent(new Event('cch:friendships-changed'));
        } catch {
            setActionError(true);
        } finally {
            setBusyId(null);
        }
    }

    async function handleFriendMessageOpen(event, friendId) {
        event.preventDefault();
        setActionError(false);

        try {
            const conversation = await openOrCreatePrivateConversation(
                user.id,
                friendId,
            );
            setOpen(false);
            window.location.assign(
                `/users/${encodeURIComponent(user.id)}?conversation=${encodeURIComponent(conversation.id)}#private-messages`,
            );
        } catch {
            setActionError(true);
        }
    }
    async function handleCommentOpen(commentId) {
        try {
            await markCommentNotificationRead(user.id, commentId);
            setCommentNotifications((current) => current.filter(
                (item) => item.id !== commentId,
            ));
            window.dispatchEvent(new Event('cch:comments-read'));
        } catch {
            setActionError(true);
        }

        setOpen(false);
    }

    async function handleEngagementOpen(eventId) {
        try {
            await markEngagementNotificationRead(user.id, eventId);
            setEngagementNotifications((current) => current.filter(
                (item) => item.id !== eventId,
            ));
        } catch {
            setActionError(true);
        }

        setOpen(false);
    }

    function engagementMessage(item) {
        const name = memberName(item.profile, t('reactionsRatings'));
        const label = item.target_label || (
            item.type === 'story_rating'
                ? t('storyTarget')
                : item.type === 'file_rating'
                    ? t('fileTarget')
                    : t('commentTarget')
        );

        if (item.type === 'comment_reaction') {
            const key = item.value === 'dislike'
                ? 'dislikedComment'
                : 'likedComment';

            return t(key).replace('{name}', name);
        }

        const key = item.type === 'story_rating'
            ? 'ratedStory'
            : 'ratedFile';

        return t(key)
            .replace('{name}', name)
            .replace('{target}', label)
            .replace('{rating}', item.value || '');
    }

    function engagementHref(item) {
        if (item.type === 'story_rating') {
            return `/stories/${encodeURIComponent(item.target_id)}`;
        }

        if (item.type === 'file_rating') {
            return `/my-files#file-${encodeURIComponent(item.target_id)}`;
        }

        const commentHash = `#comment-${item.target_id}`;

        if (item.context_type === 'story') {
            return `/stories/${encodeURIComponent(item.context_id)}${commentHash}`;
        }

        if (item.context_type === 'heritage') {
            return `/heritage/${encodeURIComponent(item.context_id)}${commentHash}`;
        }

        return `/my-files${commentHash}`;
    }

    return (
        <div className={styles.root} ref={rootRef}>
            <button
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`${t('ariaLabel')}${count > 0 ? ` (${count})` : ''}`}
                className={`${styles.bellButton} ${count > 0 ? styles.hasUnread : ''}`}
                type="button"
                onClick={() => {
                    const nextOpen = !open;
                    setOpen(nextOpen);

                    if (nextOpen) {
                        setExpanded({
                            messages: null,
                            friends: null,
                            comments: null,
                        });
                        loadNotifications({ silent: true });
                    }
                }}
            >
                <span aria-hidden="true" className={styles.bellIcon}>
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                    </svg>
                </span>
                {count > 0 && (
                    <span className={styles.badge}>{count > 9 ? '9+' : count}</span>
                )}
            </button>

            {open && (
                <div aria-label={t('title')} className={styles.panel} role="dialog">
                    <div className={styles.panelHeader}>
                        <div>
                            <span>{t('ariaLabel')}</span>
                            <strong>{t('title')}</strong>
                            {count > 0 && (
                                <small>{t('totalNew').replace('{count}', count)}</small>
                            )}
                        </div>
                        <button
                            aria-label={t('close')}
                            className={styles.closeButton}
                            type="button"
                            onClick={() => setOpen(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className={styles.panelBody}>
                        {loading && !ready ? (
                            <p className={styles.status}>{t('loading')}</p>
                        ) : loadError && !ready ? (
                            <p className={styles.error} role="alert">{t('loadError')}</p>
                        ) : (
                            <>
                                <AccordionSection
                                    count={unreadMessageCount}
                                    expanded={isExpanded('messages', unreadMessageCount)}
                                    id="notification-messages"
                                    title={t('privateMessages')}
                                    onToggle={() => toggleSection('messages', unreadMessageCount)}
                                >
                                    {visibleMessages.length === 0 ? (
                                        <p className={styles.empty}>{t('emptyMessages')}</p>
                                    ) : visibleMessages.map((item) => {
                                        const name = memberName(item.profile, t('privateMessages'));
                                        const message = item.count === 1
                                            ? t('privateMessageFrom').replace('{name}', name)
                                            : t('privateMessagesFrom')
                                                .replace('{name}', name)
                                                .replace('{count}', item.count);

                                        return (
                                            <article className={styles.notification} key={item.conversation_id}>
                                                <div className={styles.notificationCopy}>
                                                    <p>{message}</p>
                                                    <Link
                                                        className={styles.profileLink}
                                                        to={`/users/${encodeURIComponent(user.id)}?conversation=${encodeURIComponent(item.conversation_id)}#private-messages`}
                                                        onClick={() => {
                                                            const conversationId = item.conversation_id;

                                                            setMessageNotifications((current) => current.filter(
                                                                (notification) => notification.conversation_id !== conversationId,
                                                            ));
                                                            setOpen(false);
                                                            window.dispatchEvent(new Event('cch:messages-read'));
                                                        }}
                                                    >
                                                        {t('openMessages')}
                                                    </Link>
                                                </div>
                                            </article>
                                        );
                                    })}
                                    <div className={styles.messageFriendList}>
                                        <p className={styles.messageFriendHeading}>
                                            {t('friendsYouCanMessage')}
                                        </p>

                                        {visibleFriends.length === 0 ? (
                                            <p className={styles.messageFriendEmpty}>
                                                {t('noAcceptedFriends')}
                                            </p>
                                        ) : (
                                            visibleFriends.map((item) => {
                                                const friendUnreadNotifications = visibleMessages
                                                    .filter((notification) => (
                                                        notification.profile?.id === item.other_user_id
                                                        || notification.other_user_id === item.other_user_id
                                                    ));
                                                const unreadCount = friendUnreadNotifications
                                                    .reduce(
                                                        (sum, notification) => sum + notification.count,
                                                        0,
                                                    );
                                                const conversationId = friendUnreadNotifications[0]?.conversation_id;
                                                const path = conversationId
                                                    ? `/users/${encodeURIComponent(user.id)}?conversation=${encodeURIComponent(conversationId)}#private-messages`
                                                    : memberPath(item.profile)
                                                        || `/users/${encodeURIComponent(item.other_user_id)}`;
                                                const name = memberName(
                                                    item.profile,
                                                    t('privateMessages'),
                                                );

                                                return (
                                                    <Link
                                                        className={styles.messageFriendLink}
                                                        key={item.id}
                                                        to={path}
                                                        onClick={(event) => handleFriendMessageOpen(event, item.other_user_id)}
                                                    >
                                                        <span>{name}</span>
                                                        <span className={styles.messageFriendActions}>
                                                            {unreadCount > 0 && (
                                                                <strong
                                                                    className={styles.messageFriendUnread}
                                                                    aria-label={`${unreadCount} ${t('privateMessages')}`}
                                                                >
                                                                    {unreadCount}
                                                                </strong>
                                                            )}
                                                            <small>{t('openMessages')}</small>
                                                        </span>
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>                                </AccordionSection>

                                <AccordionSection
                                    count={friendRequestCount}
                                    expanded={isExpanded('friends', friendRequestCount)}
                                    id="notification-friends"
                                    title={t('friendRequests')}
                                    onToggle={() => toggleSection('friends', friendRequestCount)}
                                >
                                    {visibleIncoming.length === 0 ? (
                                        <p className={styles.empty}>{t('emptyFriends')}</p>
                                    ) : visibleIncoming.map((item) => {
                                        const path = memberPath(item.profile);
                                        const name = memberName(item.profile, t('friendRequests'));
                                        const message = t('friendRequestFrom').replace('{name}', name);
                                        const busy = busyId === item.id;

                                        return (
                                            <article className={styles.notification} key={item.id}>
                                                <div className={styles.notificationCopy}>
                                                    <p>{message}</p>
                                                    {path && (
                                                        <Link
                                                            className={styles.profileLink}
                                                            to={`${path}#friendship-section`}
                                                            onClick={() => setOpen(false)}
                                                        >
                                                            {t('viewProfile')}
                                                        </Link>
                                                    )}
                                                </div>
                                                <div className={styles.actions}>
                                                    <button
                                                        className={styles.acceptButton}
                                                        disabled={busy}
                                                        type="button"
                                                        onClick={() => handleAction(item.id, acceptFriendRequest)}
                                                    >
                                                        {t('accept')}
                                                    </button>
                                                    <button
                                                        className={styles.declineButton}
                                                        disabled={busy}
                                                        type="button"
                                                        onClick={() => handleAction(item.id, deleteFriendship)}
                                                    >
                                                        {t('decline')}
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </AccordionSection>

                                <AccordionSection
                                    count={commentCount}
                                    expanded={isExpanded('comments', commentCount)}
                                    id="notification-comments"
                                    title={t('comments')}
                                    onToggle={() => toggleSection('comments', commentCount)}
                                >
                                    {visibleComments.length === 0 ? (
                                        <p className={styles.empty}>{t('emptyComments')}</p>
                                    ) : visibleComments.map((item) => {
                                        const name = memberName(item.profile, t('comments'));
                                        const target = item.target_title
                                            || (item.target_type === 'story'
                                                ? t('storyTarget')
                                                : t('fileTarget'));
                                        const message = t('commentFrom')
                                            .replace('{name}', name)
                                            .replace('{target}', target);
                                        const commentHash = `#comment-${item.id}`;
                                        const href = item.target_type === 'story'
                                            ? `/stories/${encodeURIComponent(item.target_id)}${commentHash}`
                                            : `/my-files${commentHash}`;

                                        return (
                                            <article className={styles.notification} key={item.id}>
                                                <div className={styles.notificationCopy}>
                                                    <p>{message}</p>
                                                    <Link
                                                        className={styles.profileLink}
                                                        to={href}
                                                        onClick={() => handleCommentOpen(item.id)}
                                                    >
                                                        {t('openComment')}
                                                    </Link>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </AccordionSection>

                                <AccordionSection
                                    count={engagementCount}
                                    expanded={isExpanded('engagements', engagementCount)}
                                    id="notification-engagements"
                                    title={t('reactionsRatings')}
                                    onToggle={() => toggleSection('engagements', engagementCount)}
                                >
                                    {visibleEngagements.length === 0 ? (
                                        <p className={styles.empty}>{t('emptyReactionsRatings')}</p>
                                    ) : visibleEngagements.map((item) => (
                                        <article className={styles.notification} key={item.id}>
                                            <div className={styles.notificationCopy}>
                                                <p>{engagementMessage(item)}</p>
                                                <Link
                                                    className={styles.profileLink}
                                                    to={engagementHref(item)}
                                                    onClick={() => handleEngagementOpen(item.id)}
                                                >
                                                    {t('openActivity')}
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </AccordionSection>
                            </>
                        )}

                        {loadError && ready && (
                            <p className={styles.inlineError} role="alert">{t('loadError')}</p>
                        )}
                        {actionError && (
                            <p className={styles.inlineError} role="alert">{t('actionError')}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
