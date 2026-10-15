import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import { fetchFriendshipWithMember } from '../services/friendshipService';
import {
    fetchConversationMessages,
    fetchPrivateConversations,
    markConversationRead,
    openOrCreatePrivateConversation,
    getPrivateMessageAttachmentUrl,
    sendPrivateMessage,
    sendPrivateMessageAttachment,
    subscribeToConversationMessages,
} from '../services/messageService';
import { getMessageTranslation } from '../i18n/messageTranslations';
import styles from './MessagesSection.module.css';

const EMOJI_OPTIONS = [
    '😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😍',
    '😘', '😎', '🤩', '🥳', '😉', '🤗', '🤔', '😅',
    '😢', '😭', '😡', '🤯', '👍', '👎', '👏', '🙏',
    '💪', '🤝', '👌', '✌️', '❤️', '💛', '💙', '💚',
    '🔥', '✨', '🎉', '💯', '🐾', '🐕', '☕', '🍻',
];
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


function appendUniqueMessage(messages, message) {
    if (!message?.id || messages.some((item) => item.id === message.id)) {
        return messages;
    }

    return [...messages, message];
}
function formatAttachmentSize(size) {
    if (!Number.isFinite(size) || size <= 0) {
        return '';
    }

    if (size < 1024 * 1024) {
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageAttachment({ message, t }) {
    const attachmentPath = message?.attachment_path || '';
    const [attachmentState, setAttachmentState] = useState({
        path: '',
        url: '',
        loadError: false,
    });

    useEffect(() => {
        if (!attachmentPath) {
            return undefined;
        }

        let active = true;

        getPrivateMessageAttachmentUrl({ attachment_path: attachmentPath })
            .then((signedUrl) => {
                if (active) {
                    setAttachmentState({
                        path: attachmentPath,
                        url: signedUrl || '',
                        loadError: false,
                    });
                }
            })
            .catch(() => {
                if (active) {
                    setAttachmentState({
                        path: attachmentPath,
                        url: '',
                        loadError: true,
                    });
                }
            });

        return () => {
            active = false;
        };
    }, [attachmentPath]);

    if (!attachmentPath) {
        return null;
    }

    const currentState = attachmentState.path === attachmentPath
        ? attachmentState
        : { url: '', loadError: false };
    const mimeType = message.attachment_mime_type || '';
    const fileName = message.attachment_name || t('attachmentOpen');
    const size = formatAttachmentSize(message.attachment_size);

    if (currentState.loadError) {
        return <p className={styles.attachmentError}>{t('attachmentLoadError')}</p>;
    }

    if (!currentState.url) {
        return <p className={styles.attachmentState}>{t('loading')}</p>;
    }

    const url = currentState.url;

    if (mimeType.startsWith('image/')) {
        return (
            <a
                className={styles.attachmentMediaLink}
                href={url}
                rel="noreferrer"
                target="_blank"
            >
                <img
                    alt={fileName}
                    className={styles.messageAttachmentImage}
                    loading="lazy"
                    src={url}
                />
                <span>{fileName}{size ? ` · ${size}` : ''}</span>
            </a>
        );
    }

    if (mimeType.startsWith('audio/')) {
        return (
            <div className={styles.attachmentMedia}>
                <audio
                    className={styles.messageAttachmentAudio}
                    controls
                    preload="metadata"
                    src={url}
                >
                    <track kind="captions" />
                </audio>
                <a href={url} rel="noreferrer" target="_blank">
                    {fileName}{size ? ` · ${size}` : ''}
                </a>
            </div>
        );
    }

    if (mimeType.startsWith('video/')) {
        return (
            <div className={styles.attachmentMedia}>
                <video
                    className={styles.messageAttachmentVideo}
                    controls
                    preload="metadata"
                    src={url}
                />
                <a href={url} rel="noreferrer" target="_blank">
                    {fileName}{size ? ` · ${size}` : ''}
                </a>
            </div>
        );
    }

    return (
        <a
            className={styles.attachmentFileLink}
            href={url}
            rel="noreferrer"
            target="_blank"
        >
            <span aria-hidden="true">📄</span>
            <span>
                <strong>{fileName}</strong>
                {size && <small>{size}</small>}
            </span>
        </a>
    );
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
    const [emojiOpen, setEmojiOpen] = useState(false);
    const textareaRef = useRef(null);
    const emojiPickerRef = useRef(null);    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

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

    useEffect(() => {
        if (
            !conversation?.id
            || !user?.id
            || loadedConversationId !== conversation.id
        ) {
            return undefined;
        }

        let active = true;

        const unsubscribe = subscribeToConversationMessages(
            conversation.id,
            async (message) => {
                if (!active || message?.conversation_id !== conversation.id) {
                    return;
                }

                setMessages((current) => appendUniqueMessage(current, message));

                if (message.sender_id !== user.id) {
                    try {
                        await markConversationRead(conversation.id, user.id);

                        if (active) {
                            window.dispatchEvent(new Event('cch:messages-read'));
                        }
                    } catch {
                        // Realtime delivery must remain usable if read-state sync fails.
                    }
                }
            },
        );

        return () => {
            active = false;
            unsubscribe();
        };
    }, [conversation?.id, loadedConversationId, user?.id]);

    useEffect(() => {
        if (!conversation?.id || !user?.id) {
            return undefined;
        }

        let active = true;

        async function handleRealtimeMessage(event) {
            const message = event.detail;

            if (
                !active
                || !message
                || message.conversation_id !== conversation.id
            ) {
                return;
            }

            setMessages((current) => appendUniqueMessage(current, message));
            setLoadedConversationId(conversation.id);

            if (message.sender_id !== user.id) {
                try {
                    await markConversationRead(conversation.id, user.id);

                    if (active) {
                        window.dispatchEvent(new Event('cch:messages-read'));
                    }
                } catch {
                    // Keep the live thread usable if read-state synchronization fails.
                }
            }
        }

        window.addEventListener('cch:realtime-message', handleRealtimeMessage);

        return () => {
            active = false;
            window.removeEventListener('cch:realtime-message', handleRealtimeMessage);
        };
    }, [conversation?.id, user?.id]);

    useEffect(() => {
        if (!emojiOpen) {
            return undefined;
        }

        function closePicker(event) {
            if (!emojiPickerRef.current?.contains(event.target)) {
                setEmojiOpen(false);
            }
        }

        function closeOnEscape(event) {
            if (event.key === 'Escape') {
                setEmojiOpen(false);
                textareaRef.current?.focus();
            }
        }

        document.addEventListener('pointerdown', closePicker);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('pointerdown', closePicker);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [emojiOpen]);

    function insertEmoji(emoji) {
        const textarea = textareaRef.current;
        const start = textarea?.selectionStart ?? draft.length;
        const end = textarea?.selectionEnd ?? draft.length;
        const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, 2000);
        const nextCaret = Math.min(start + emoji.length, next.length);

        setDraft(next);
        setSendError(false);

        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
        });
    }
    if (!conversation?.id) {
        return null;
    }

    const visibleMessages = loadedConversationId === conversation.id ? messages : [];

    async function handleSubmit(event) {
        event.preventDefault();

        const value = draft.trim();

        if ((!value && !selectedFile) || sending) {
            return;
        }

        setSending(true);
        setSendError(false);

        try {
            const saved = selectedFile
                ? await sendPrivateMessageAttachment(
                    conversation.id,
                    user.id,
                    selectedFile,
                    value,
                )
                : await sendPrivateMessage(
                    conversation.id,
                    user.id,
                    value,
                );

            setMessages((current) => appendUniqueMessage(current, saved));
            setLoadedConversationId(conversation.id);
            setDraft('');
            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

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
                                {(!message.attachment_path || message.body !== message.attachment_name) && (
                                    <p>{message.body}</p>
                                )}
                                <MessageAttachment message={message} t={t} />
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
                <div className={styles.attachmentPicker}>
                    <input
                        accept="image/*,audio/*,video/*,.pdf,.txt,.csv,.doc,.docx,.odt,.xls,.xlsx"
                        className={styles.attachmentInput}
                        ref={fileInputRef}
                        type="file"
                        onChange={(event) => {
                            setSelectedFile(event.target.files?.[0] || null);
                            setSendError(false);
                        }}
                    />
                    <button
                        aria-label={t('attachmentButtonLabel')}
                        className={styles.attachmentButton}
                        disabled={sending}
                        title={t('attachmentButtonLabel')}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span aria-hidden="true">📎</span>
                    </button>
                </div>
                <div className={styles.emojiPicker} ref={emojiPickerRef}>
                    <button
                        aria-expanded={emojiOpen}
                        aria-label={t('emojiButtonLabel')}
                        className={styles.emojiButton}
                        title={t('emojiButtonLabel')}
                        type="button"
                        onClick={() => setEmojiOpen((current) => !current)}
                    >
                        <span aria-hidden="true">😀</span>
                    </button>

                    {emojiOpen && (
                        <div
                            aria-label={t('emojiPanelLabel')}
                            className={styles.emojiPanel}
                            role="group"
                        >
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    aria-label={emoji}
                                    className={styles.emojiOption}
                                    key={emoji}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {selectedFile && (
                    <div className={styles.attachmentPreview}>
                        <span>
                            {t('attachmentSelected')}: <strong>{selectedFile.name}</strong>
                        </span>
                        <button
                            aria-label={t('attachmentRemoveLabel')}
                            type="button"
                            onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
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
                <button disabled={sending || (!draft.trim() && !selectedFile)} type="submit">
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
