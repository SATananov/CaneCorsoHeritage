import { useEffect, useMemo, useState } from 'react';
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
import styles from './CommentsSection.module.css';

const MAX_COMMENT_LENGTH = 2000;

const DATE_LOCALES = {
    en: 'en-US',
    bg: 'bg-BG',
    it: 'it-IT',
};

function CommentsSection({ targetType, targetId }) {
    const { language } = useLanguage();
    const {
        user,
        isAdmin,
        isActive,
    } = useAuth();
    const [comments, setComments] = useState([]);
    const [profilesById, setProfilesById] = useState({});
    const [commentText, setCommentText] = useState('');
    const [editingId, setEditingId] = useState('');
    const [editText, setEditText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState('');
    const [error, setError] = useState('');

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

        async function loadComments() {
            setLoading(true);
            setError('');

            try {
                const nextComments = await fetchComments(
                    targetType,
                    targetId,
                    { signal: controller.signal },
                );

                const profiles = await fetchCommentAuthorProfiles(
                    nextComments.map((comment) => comment.author_id),
                    { signal: controller.signal },
                );

                if (!active) {
                    return;
                }

                setComments(nextComments);
                setProfilesById(
                    Object.fromEntries(
                        profiles.map((profile) => [profile.id, profile]),
                    ),
                );
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError(getTranslation(language, 'comments', 'loadError'));
                }
            } finally {
                if (active) {
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
        const nextComments = await fetchComments(targetType, targetId);
        const profiles = await fetchCommentAuthorProfiles(
            nextComments.map((comment) => comment.author_id),
        );

        setComments(nextComments);
        setProfilesById(
            Object.fromEntries(
                profiles.map((profile) => [profile.id, profile]),
            ),
        );
    }

    async function submitHandler(event) {
        event.preventDefault();

        if (!user || !isActive || saving) {
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

        setSaving(true);
        setError('');

        try {
            await createComment(targetType, targetId, cleanText);
            await refreshComments();
            setCommentText('');
        } catch {
            setError(t('saveError'));
        } finally {
            setSaving(false);
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
            await updateComment(commentId, cleanText);
            await refreshComments();
            cancelEdit();
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
            await refreshComments();

            if (editingId === commentId) {
                cancelEdit();
            }
        } catch {
            setError(t('deleteError'));
        } finally {
            setActionId('');
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
                            && (user.id === comment.author_id || isAdmin),
                        );
                        const isEditing = editingId === comment.id;
                        const isBusy = actionId === comment.id;

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
