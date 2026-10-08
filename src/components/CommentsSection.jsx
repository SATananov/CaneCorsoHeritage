import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { getProfileAvatarUrl } from '../services/profileService';
import {
    createComment,
    deleteComment,
    fetchCommentAuthorProfiles,
    fetchComments,
    updateComment,
} from '../services/commentService';
import {
    fetchCommentReactions,
    removeCommentReaction,
    setCommentReaction,
} from '../services/commentReactionService';
import styles from './CommentsSection.module.css';

const MAX_COMMENT_LENGTH = 2000;

const DATE_LOCALES = {
    en: 'en-US',
    bg: 'bg-BG',
    it: 'it-IT',
};


async function fetchCommentSecondaryData(comments, options) {
    const [profilesResult, reactionsResult] = await Promise.allSettled([
        fetchCommentAuthorProfiles(
            comments.map((comment) => comment.author_id),
            options,
        ),
        fetchCommentReactions(
            comments.map((comment) => comment.id),
            options,
        ),
    ]);

    for (const result of [profilesResult, reactionsResult]) {
        if (result.status === 'rejected' && result.reason?.name === 'AbortError') {
            throw result.reason;
        }
    }

    return {
        profiles: profilesResult.status === 'fulfilled' ? profilesResult.value : [],
        reactions: reactionsResult.status === 'fulfilled' ? reactionsResult.value : [],
    };
}

function CommentsSection({ targetType, targetId }) {
    const { user, isActive } = useAuth();

    return (
        <CommentsForTarget
            key={JSON.stringify([targetType, targetId, user?.id ?? null])}
            targetType={targetType}
            targetId={targetId}
            user={user}
            isActive={isActive}
        />
    );
}

function CommentsForTarget({ targetType, targetId, user, isActive }) {
    const { language } = useLanguage();
    const [comments, setComments] = useState([]);
    const [profilesById, setProfilesById] = useState({});
    const [commentText, setCommentText] = useState('');
    const [editingId, setEditingId] = useState('');
    const [editText, setEditText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState('');
    const [reactions, setReactions] = useState([]);
    const [reactionActionId, setReactionActionId] = useState('');
    const [error, setError] = useState('');
    const scopeRef = useRef(null);
    const listRequestRef = useRef(0);

    // A target/account change remounts this state; pending work belongs to its scope.
    useEffect(() => {
        const scope = { submitting: false };
        scopeRef.current = scope;

        return () => {
            scopeRef.current = null;
            listRequestRef.current += 1;
        };
    }, []);

    const t = (key) => getTranslation(language, 'comments', key);

    const dateFormatter = useMemo(
        () => new Intl.DateTimeFormat(DATE_LOCALES[language] ?? 'en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }),
        [language],
    );

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        const request = ++listRequestRef.current;
        const isCurrent = () => active && request === listRequestRef.current;

        async function loadComments() {
            setLoading(true);
            setError('');

            try {
                const nextComments = await fetchComments(
                    targetType,
                    targetId,
                    { signal: controller.signal },
                );

                const { profiles, reactions: nextReactions } = await fetchCommentSecondaryData(
                    nextComments,
                    { signal: controller.signal },
                );

                if (!isCurrent()) {
                    return;
                }

                setComments(nextComments);
                setReactions(nextReactions);
                setProfilesById(
                    Object.fromEntries(
                        profiles.map((profile) => [profile.id, profile]),
                    ),
                );
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && isCurrent()) {
                    setError(getTranslation(language, 'comments', 'loadError'));
                }
            } finally {
                if (isCurrent()) {
                    setLoading(false);
                }
            }
        }

        loadComments();

        return () => {
            active = false;
            controller.abort();
        };
    }, [language, targetId, targetType]);

    async function refreshComments() {
        const scope = scopeRef.current;
        if (!scope) return false;
        const request = ++listRequestRef.current;
        const isCurrent = () => scopeRef.current === scope
            && request === listRequestRef.current;

        try {
            const nextComments = await fetchComments(targetType, targetId);
            const { profiles, reactions: nextReactions } = await fetchCommentSecondaryData(
                nextComments,
            );

            if (!isCurrent()) return false;
            setComments(nextComments);
            setReactions(nextReactions);
            setProfilesById(
                Object.fromEntries(
                    profiles.map((profile) => [profile.id, profile]),
                ),
            );
            setError('');
            return true;
        } catch (loadError) {
            if (isCurrent()) throw loadError;
            return false;
        } finally {
            if (isCurrent()) setLoading(false);
        }
    }

    async function submitHandler(event) {
        event.preventDefault();

        const scope = scopeRef.current;
        if (!user || !isActive || saving || !scope || scope.submitting) {
            return;
        }

        const cleanText = commentText.trim();

        if (!cleanText) {
            setError(t('emptyError'));
            return;
        }

        if (cleanText.length > MAX_COMMENT_LENGTH) {
            setError(t('lengthError'));
            return;
        }

        scope.submitting = true;
        setSaving(true);
        setError('');

        try {
            const savedComment = await createComment(targetType, targetId, cleanText);
            if (scopeRef.current !== scope) return;

            // Creation is committed even if the subsequent list read fails.
            setCommentText('');
            setComments((current) => [
                ...current.filter((comment) => comment.id !== savedComment.id),
                savedComment,
            ]);

            try {
                await refreshComments();
            } catch {
                if (scopeRef.current === scope) setError(t('loadError'));
            }
        } catch {
            if (scopeRef.current === scope) setError(t('saveError'));
        } finally {
            scope.submitting = false;
            if (scopeRef.current === scope) setSaving(false);
        }
    }

    function startEdit(comment) {
        setEditingId(comment.id);
        setEditText(comment.content);
        setError('');
    }

    function cancelEdit() {
        setEditingId('');
        setEditText('');
    }

    async function saveEdit(commentId) {
        const cleanText = editText.trim();

        if (!cleanText) {
            setError(t('emptyError'));
            return;
        }

        if (cleanText.length > MAX_COMMENT_LENGTH) {
            setError(t('lengthError'));
            return;
        }

        setActionId(commentId);
        setError('');

        try {
            const savedComment = await updateComment(commentId, cleanText);
            setComments((current) => current.map((comment) => (
                comment.id === commentId ? savedComment : comment
            )));
            cancelEdit();

            try {
                await refreshComments();
            } catch {
                setError(t('loadError'));
            }
        } catch {
            setError(t('updateError'));
        } finally {
            setActionId('');
        }
    }

    async function removeComment(commentId) {
        if (!window.confirm(t('deleteConfirm'))) {
            return;
        }

        setActionId(commentId);
        setError('');

        try {
            await deleteComment(commentId);
            setComments((current) => current.filter((comment) => comment.id !== commentId));
            setReactions((current) => current.filter((item) => item.comment_id !== commentId));

            if (editingId === commentId) {
                cancelEdit();
            }

            try {
                await refreshComments();
            } catch {
                setError(t('loadError'));
            }
        } catch {
            setError(t('deleteError'));
        } finally {
            setActionId('');
        }
    }

    async function toggleReaction(commentId, reaction) {
        if (!user || !isActive || reactionActionId) {
            return;
        }

        const currentReaction = reactions.find(
            (item) => item.comment_id === commentId && item.user_id === user.id,
        );

        setReactionActionId(commentId);
        setError('');

        try {
            if (currentReaction?.reaction === reaction) {
                await removeCommentReaction(commentId);

                setReactions((current) => current.filter(
                    (item) => !(
                        item.comment_id === commentId
                        && item.user_id === user.id
                    ),
                ));
            } else {
                const savedReaction = await setCommentReaction(commentId, reaction);

                setReactions((current) => [
                    ...current.filter(
                        (item) => !(
                            item.comment_id === commentId
                            && item.user_id === user.id
                        ),
                    ),
                    savedReaction,
                ]);
            }
        } catch {
            setError(t('reactionError'));
        } finally {
            setReactionActionId('');
        }
    }

    function authorLabel(profile) {
        if (profile?.display_name?.trim()) {
            return profile.display_name.trim();
        }

        if (profile?.username?.trim()) {
            return `@${profile.username.trim()}`;
        }

        return t('member');
    }

    function avatarFallback(profile) {
        const source = profile?.display_name?.trim()
            || profile?.username?.trim()
            || t('member');

        return source.slice(0, 1).toUpperCase();
    }

    return (
        <section className={styles.comments} aria-labelledby={`comments-${targetType}-${targetId}`}>
            <div className={styles.headingRow}>
                <div>
                    <span className={styles.kicker}>{t('community')}</span>
                    <h2
                        className={styles.title}
                        id={`comments-${targetType}-${targetId}`}
                    >
                        {t('title')} ({comments.length})
                    </h2>
                </div>
            </div>

            {loading ? (
                <p className={styles.status} aria-live="polite">
                    {t('loading')}
                </p>
            ) : comments.length === 0 ? (
                <p className={styles.empty}>{t('noComments')}</p>
            ) : (
                <div className={styles.list}>
                    {comments.map((comment) => {
                        const profile = profilesById[comment.author_id];
                        const avatarUrl = getProfileAvatarUrl(profile);
                        const canManage = Boolean(
                            user?.id
                            && isActive
                            && user.id === comment.author_id,
                        );
                        const isEditing = editingId === comment.id;
                        const isBusy = actionId === comment.id;
                        const isReactionBusy = reactionActionId === comment.id;

                        const commentReactions = reactions.filter(
                            (item) => item.comment_id === comment.id,
                        );

                        const likeCount = commentReactions.filter(
                            (item) => item.reaction === 'like',
                        ).length;

                        const dislikeCount = commentReactions.filter(
                            (item) => item.reaction === 'dislike',
                        ).length;

                        const myReaction = user?.id
                            ? commentReactions.find(
                                (item) => item.user_id === user.id,
                            )?.reaction ?? ''
                            : '';

                        return (
                            <article className={styles.comment} key={comment.id}>
                                <div className={styles.authorRow}>
                                    <div className={styles.avatar} aria-hidden="true">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" />
                                        ) : (
                                            <span>{avatarFallback(profile)}</span>
                                        )}
                                    </div>

                                    <div className={styles.authorMeta}>
                                        <strong>{authorLabel(profile)}</strong>
                                        <time dateTime={comment.created_at}>
                                            {dateFormatter.format(new Date(comment.created_at))}
                                        </time>
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className={styles.editBox}>
                                        <textarea
                                            className={styles.textarea}
                                            maxLength={MAX_COMMENT_LENGTH}
                                            value={editText}
                                            onChange={(event) => setEditText(event.target.value)}
                                            disabled={isBusy}
                                        />
                                        <div className={styles.counter}>
                                            {editText.length} / {MAX_COMMENT_LENGTH}
                                        </div>
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.primaryButton}
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => saveEdit(comment.id)}
                                            >
                                                {isBusy ? t('saving') : t('save')}
                                            </button>
                                            <button
                                                className={styles.secondaryButton}
                                                type="button"
                                                disabled={isBusy}
                                                onClick={cancelEdit}
                                            >
                                                {t('cancel')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className={styles.content}>{comment.content}</p>

                                        {comment.updated_at !== comment.created_at && (
                                            <span className={styles.edited}>{t('edited')}</span>
                                        )}

                                        {canManage && (
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.textButton}
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => startEdit(comment)}
                                                >
                                                    {t('edit')}
                                                </button>
                                                <button
                                                    className={styles.deleteButton}
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => removeComment(comment.id)}
                                                >
                                                    {isBusy ? t('deleting') : t('delete')}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div
                                    className={styles.reactions}
                                    aria-label={t('reactions')}
                                >
                                    <button
                                        className={`${styles.reactionButton} ${
                                            myReaction === 'like'
                                                ? styles.reactionActive
                                                : ''
                                        }`}
                                        type="button"
                                        aria-pressed={myReaction === 'like'}
                                        aria-label={`${t('like')} (${likeCount})`}
                                        title={
                                            user && isActive
                                                ? t('like')
                                                : t('signInToReact')
                                        }
                                        disabled={!user || !isActive || isReactionBusy}
                                        onClick={() => toggleReaction(comment.id, 'like')}
                                    >
                                        <span aria-hidden="true">👍</span>
                                        <span>{likeCount}</span>
                                    </button>

                                    <button
                                        className={`${styles.reactionButton} ${
                                            myReaction === 'dislike'
                                                ? styles.reactionActive
                                                : ''
                                        }`}
                                        type="button"
                                        aria-pressed={myReaction === 'dislike'}
                                        aria-label={`${t('dislike')} (${dislikeCount})`}
                                        title={
                                            user && isActive
                                                ? t('dislike')
                                                : t('signInToReact')
                                        }
                                        disabled={!user || !isActive || isReactionBusy}
                                        onClick={() => toggleReaction(comment.id, 'dislike')}
                                    >
                                        <span aria-hidden="true">👎</span>
                                        <span>{dislikeCount}</span>
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {user && isActive ? (
                <form className={styles.form} onSubmit={submitHandler}>
                    <label className={styles.label} htmlFor={`comment-input-${targetType}-${targetId}`}>
                        {t('addComment')}
                    </label>
                    <textarea
                        className={styles.textarea}
                        id={`comment-input-${targetType}-${targetId}`}
                        maxLength={MAX_COMMENT_LENGTH}
                        placeholder={t('placeholder')}
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        disabled={saving}
                    />
                    <div className={styles.formFooter}>
                        <span className={styles.counter}>
                            {commentText.length} / {MAX_COMMENT_LENGTH}
                        </span>
                        <button
                            className={styles.primaryButton}
                            type="submit"
                            disabled={saving || !commentText.trim()}
                        >
                            {saving ? t('publishing') : t('publish')}
                        </button>
                    </div>
                </form>
            ) : user ? (
                <p className={styles.note}>{t('inactive')}</p>
            ) : (
                <p className={styles.note}>
                    <Link to="/login">{t('signIn')}</Link> {t('signInToComment')}
                </p>
            )}

            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}

export default CommentsSection;


