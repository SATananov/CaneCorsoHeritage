import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import { fetchFriendshipWithMember } from '../services/friendshipService';
import {
    fetchConversationMessages,
    fetchPrivateConversations,
    markConversationRead,
    openOrCreatePrivateConversation,
    sendPrivateMessage,
} from '../services/messageService';
import { getMessageTranslation } from '../i18n/messageTranslations';
import styles from './MessagesSection.module.css';

function profileName(profile, fallback) {
    return profile?.display_name?.trim()
        || (profile?.username ? `@${profile.username}` : fallback);
}

function profilePath(profile) {
    return profile?.username
        ? `/members/${encodeURIComponent(profile.username)}`
        : null;
}

function formatMessageTime(value, language) {
    if (!value) {
        return '';
    }

    const locale = language === 'bg'
        ? 'bg-BG'
        : language === 'it'
            ? 'it-IT'
            : 'en-GB';

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function MessageThread({ conversation, otherProfile, onMessageSent }) {
    const { language } = useLanguage();
    const { user } = useAuth();
    const t = (key) => getMessageTranslation(language, key);
    const [messages, setMessages] = useState([]);
    const [loadedConversationId, setLoadedConversationId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(false);

    useEffect(() => {
        if (!conversation?.id || !user?.id) {
            return undefined;
        }

        const controller = new AbortController();
        let active = true;

        Promise.resolve().then(async () => {
            setLoading(true);
            setLoadError(false);

            try {
                const result = await fetchConversationMessages(
                    conversation.id,
                    { signal: controller.signal },
                );

                if (active && !controller.signal.aborted) {
                    setMessages(result);
                    setLoadedConversationId(conversation.id);

                    try {
                        await markConversationRead(conversation.id, user.id);

                        if (active && !controller.signal.aborted) {
                            window.dispatchEvent(new Event('cch:messages-read'));
                        }
                    } catch {
                        // Reading the thread must remain usable even if read-state sync fails.
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
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [conversation?.id, user?.id]);

    if (!conversation?.id) {
        return null;
    }

    const visibleMessages = loadedConversationId === conversation.id ? messages : [];

    async function handleSubmit(event) {
        event.preventDefault();

        const value = draft.trim();

        if (!value || sending) {
            return;
        }

        setSending(true);
        setSendError(false);

        try {
            const saved = await sendPrivateMessage(
                conversation.id,
                user.id,
                value,
            );

            setMessages((current) => [...current, saved]);
            setLoadedConversationId(conversation.id);
            setDraft('');
            onMessageSent?.(saved);
            window.dispatchEvent(new Event('cch:messages-changed'));
        } catch {
            setSendError(true);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={styles.thread}>
            <div className={styles.threadHeader}>
                <div>
                    <span>{t('privateBadge')}</span>
                    <strong>{profileName(otherProfile, t('memberFallback'))}</strong>
                </div>
                {profilePath(otherProfile) && (
                    <Link to={profilePath(otherProfile)}>
                        {profileName(otherProfile, t('memberFallback'))}
                    </Link>
                )}
            </div>

            <div className={styles.messageList} aria-live="polite">
                {loading && loadedConversationId !== conversation.id ? (
                    <p className={styles.state}>{t('loading')}</p>
                ) : loadError && loadedConversationId !== conversation.id ? (
                    <p className={styles.error} role="alert">{t('loadError')}</p>
                ) : visibleMessages.length === 0 ? (
                    <p className={styles.state}>{t('emptyThread')}</p>
                ) : (
                    visibleMessages.map((message) => {
                        const own = message.sender_id === user.id;

                        return (
                            <div
                                className={`${styles.message} ${own ? styles.ownMessage : ''}`}
                                key={message.id}
                            >
                                <span>{own ? t('you') : profileName(otherProfile, t('memberFallback'))}</span>
                                <p>{message.body}</p>
                                <small>{formatMessageTime(message.created_at, language)}</small>
                            </div>
                        );
                    })
                )}
            </div>

            {loadError && loadedConversationId === conversation.id && (
                <p className={styles.inlineError} role="alert">{t('loadError')}</p>
            )}

            <form className={styles.composer} onSubmit={handleSubmit}>
                <textarea
                    maxLength={2000}
                    placeholder={t('messagePlaceholder')}
                    rows={3}
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        if (sendError) {
                            setSendError(false);
                        }
                    }}
                />
                <button disabled={sending || !draft.trim()} type="submit">
                    {sending ? t('sending') : t('send')}
                </button>
            </form>

            {sendError && (
                <p className={styles.inlineError} role="alert">{t('sendError')}</p>
            )}
        </div>
    );
}

function MessagesSection({ profileId, isOwnProfile }) {
    const { language } = useLanguage();
    const { user, roleLoading, isActive } = useAuth();
    const location = useLocation();
    const t = (key) => getMessageTranslation(language, key);
    const requestedConversationId = useMemo(
        () => new URLSearchParams(location.search).get('conversation'),
        [location.search],
    );
    const userId = user?.id;
    const canUseMessages = Boolean(userId && !roleLoading && isActive);

    const [friendship, setFriendship] = useState(null);
    const [friendshipLoadedFor, setFriendshipLoadedFor] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loadedOwnerId, setLoadedOwnerId] = useState(null);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [opening, setOpening] = useState(false);
    const [openError, setOpenError] = useState(false);

    useEffect(() => {
        if (!canUseMessages || !profileId) {
            return undefined;
        }

        const controller = new AbortController();
        let active = true;

        Promise.resolve().then(async () => {
            setLoading(true);
            setLoadError(false);

            try {
                if (isOwnProfile) {
                    const result = await fetchPrivateConversations(
                        userId,
                        { signal: controller.signal },
                    );

                    if (active && !controller.signal.aborted) {
                        setConversations(result);
                        setLoadedOwnerId(userId);
                        setSelectedConversationId((current) => {
                            if (
                                requestedConversationId
                                && result.some(
                                    (item) => item.id === requestedConversationId,
                                )
                            ) {
                                return requestedConversationId;
                            }

                            return result.some((item) => item.id === current)
                                ? current
                                : result[0]?.id || null;
                        });
                    }
                } else {
                    const result = await fetchFriendshipWithMember(
                        userId,
                        profileId,
                        { signal: controller.signal },
                    );

                    if (active && !controller.signal.aborted) {
                        setFriendship(result);
                        setFriendshipLoadedFor(profileId);
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
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [canUseMessages, isOwnProfile, profileId, requestedConversationId, userId]);

    const visibleConversations = useMemo(
        () => (loadedOwnerId === userId ? conversations : []),
        [conversations, loadedOwnerId, userId],
    );

    const selectedConversation = useMemo(
        () => visibleConversations.find((item) => item.id === selectedConversationId) || null,
        [selectedConversationId, visibleConversations],
    );

    useEffect(() => {
        if (
            !isOwnProfile
            || loadedOwnerId !== userId
            || location.hash !== '#private-messages'
        ) {
            return;
        }

        window.requestAnimationFrame(() => {
            document.getElementById('private-messages')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [isOwnProfile, loadedOwnerId, location.hash, userId]);

    if (!canUseMessages) {
        return null;
    }

    if (!isOwnProfile) {
        const relationship = friendshipLoadedFor === profileId ? friendship : null;
        const accepted = relationship?.status === 'accepted';

        async function handleOpenConversation() {
            if (!accepted || opening) {
                return;
            }

            setOpening(true);
            setOpenError(false);

            try {
                const conversation = await openOrCreatePrivateConversation(
                    userId,
                    profileId,
                );

                setActiveConversation(conversation);
            } catch {
                setOpenError(true);
            } finally {
                setOpening(false);
            }
        }

        return (
            <section className={styles.compactSection} aria-labelledby="private-message-title">
                <div className={styles.compactHeading}>
                    <p className={styles.kicker}>{t('kicker')}</p>
                    <h2 id="private-message-title">{t('title')}</h2>
                    <p>{t('intro')}</p>
                </div>

                {loading ? (
                    <p className={styles.state}>{t('loading')}</p>
                ) : loadError ? (
                    <p className={styles.error} role="alert">{t('loadError')}</p>
                ) : accepted ? (
                    <>
                        {!activeConversation && (
                            <button
                                className={styles.startButton}
                                disabled={opening}
                                type="button"
                                onClick={handleOpenConversation}
                            >
                                {t('startConversation')}
                            </button>
                        )}
                        {activeConversation && (
                            <MessageThread
                                conversation={activeConversation}
                                otherProfile={{ id: profileId }}
                            />
                        )}
                    </>
                ) : (
                    <p className={styles.state}>{t('friendsOnly')}</p>
                )}

                {openError && (
                    <p className={styles.error} role="alert">{t('openConversationError')}</p>
                )}
            </section>
        );
    }

    return (
        <section id="private-messages" className={styles.section} aria-labelledby="my-private-messages-title">
            <div className={styles.heading}>
                <p className={styles.kicker}>{t('kicker')}</p>
                <h2 id="my-private-messages-title">{t('title')}</h2>
                <p>{t('intro')}</p>
            </div>

            {loading && loadedOwnerId !== userId ? (
                <p className={styles.state}>{t('loading')}</p>
            ) : loadError && loadedOwnerId !== userId ? (
                <p className={styles.error} role="alert">{t('loadError')}</p>
            ) : (
                <div className={styles.workspace}>
                    <aside className={styles.conversationList}>
                        <h3>{t('conversations')}</h3>

                        {visibleConversations.length === 0 ? (
                            <p className={styles.state}>{t('noConversations')}</p>
                        ) : (
                            visibleConversations.map((conversation) => (
                                <button
                                    className={
                                        conversation.id === selectedConversationId
                                            ? styles.conversationButtonActive
                                            : styles.conversationButton
                                    }
                                    key={conversation.id}
                                    type="button"
                                    onClick={() => setSelectedConversationId(conversation.id)}
                                >
                                    {profileName(conversation.profile, t('memberFallback'))}
                                </button>
                            ))
                        )}
                    </aside>

                    <div className={styles.threadPane}>
                        {selectedConversation ? (
                            <MessageThread
                                conversation={selectedConversation}
                                otherProfile={selectedConversation.profile}
                            />
                        ) : (
                            <p className={styles.state}>{t('chooseConversation')}</p>
                        )}
                    </div>
                </div>
            )}

            {loadError && loadedOwnerId === userId && (
                <p className={styles.inlineError} role="alert">{t('loadError')}</p>
            )}
        </section>
    );
}

export default MessagesSection;
