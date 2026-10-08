import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AddStoryModal from '../components/AddStoryModal';
import LoadingSpinner from '../components/LoadingSpinner';
import StoryDeleteModal from '../components/StoryDeleteModal';
import { useLanguage } from '../context/languageContext';
import useAuth from '../hooks/useAuth';
import { getTranslation } from '../i18n/translations';
import { fetchMyStories } from '../services/storyService';
import styles from './MyStoriesPage.module.css';

function MyStoriesPage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'myStories', key), [language]);
    const displayName = user?.user_metadata?.display_name || t('defaultMember');
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshError, setRefreshError] = useState('');
    const [deleteNotice, setDeleteNotice] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editingStory, setEditingStory] = useState(null);
    const [deletingStory, setDeletingStory] = useState(null);
    const refreshScopeRef = useRef(null);

    function getStoryStatusLabel(story) {
        if (story.visibility === 'private') {
            return t('privateStatus');
        }

        switch (story.moderation_status) {
            case 'pending': return t('pendingStatus');
            case 'rejected': return t('rejectedStatus');
            case 'hidden': return t('hiddenStatus');
            default: return t('approvedStatus');
        }
    }

    function getStoryEyebrow(story) {
        if (story.eyebrow === 'Community') {
            return t('approvedStatus').split(' · ')[0];
        }
        if (story.eyebrow === 'My Own') {
            return t('privateStatus').split(' · ')[0];
        }
        return story.eyebrow;
    }

    useEffect(() => {
        const controller = new AbortController();
        let request = 0;

        async function loadStories(errorKey) {
            if (controller.signal.aborted) return;

            const currentRequest = ++request;
            const isCurrent = () => !controller.signal.aborted && currentRequest === request;
            const isRefresh = errorKey === 'refreshError';

            setIsLoading(true);
            if (isRefresh) {
                setRefreshError('');
            } else {
                setError('');
            }

            try {
                const data = await fetchMyStories(user.id, { signal: controller.signal });

                if (isCurrent()) {
                    setStories(data);
                    if (isRefresh) {
                        setRefreshError('');
                    }
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && isCurrent()) {
                    if (isRefresh) {
                        setRefreshError(t(errorKey));
                    } else {
                        setError(t(errorKey));
                    }
                }
            } finally {
                if (isCurrent()) setIsLoading(false);
            }
        }

        refreshScopeRef.current = {
            userId: user.id,
            refresh: () => loadStories('refreshError'),
        };
        loadStories('loadError');

        return () => controller.abort();
    }, [t, user.id]);

    async function refreshStories() {
        const scope = refreshScopeRef.current;
        // Same-user saves refresh the current language; old-account callbacks stop here.
        if (scope?.userId !== user.id) return;
        await scope.refresh();
    }

    async function handleStoryDeleted({ storyId, cleanupWarning = '' }) {
        setStories((currentStories) => currentStories.filter((story) => story._id !== storyId));
        setDeleteNotice(cleanupWarning);
        await refreshStories();
    }

    function beginDelete(story) {
        setDeleteNotice('');
        setDeletingStory(story);
    }

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <section className={styles.heading}>
                    <div>
                        <p className="section-kicker">{t('privateArea')}</p>
                        <h1>{t('title')}</h1>
                        <p>
                            {t('signedInAs')} <strong>{displayName}</strong>. {t('introSuffix')}
                        </p>
                    </div>
                    <div className={styles.headingActions}>
                        <Link to="/my-files">{t('myFiles')}</Link>
                        <button type="button" onClick={() => setShowCreate(true)}>{t('addStory')}</button>
                    </div>
                </section>

                {isLoading && <LoadingSpinner label={t('loading')} />}

                {error && <div className={styles.message} role="alert">{error}</div>}
                {refreshError && <div className={styles.message} role="alert">{refreshError}</div>}
                {deleteNotice && <div className={styles.message} role="status">{deleteNotice}</div>}

                {!isLoading && !error && stories.length === 0 && (
                    <section className={styles.emptyState}>
                        <p className="section-kicker">{t('collection')}</p>
                        <h2>{t('empty')}</h2>
                        <p>{t('emptyCopy')}</p>
                        <button type="button" onClick={() => setShowCreate(true)}>{t('addFirst')}</button>
                    </section>
                )}

                {!isLoading && !error && stories.length > 0 && (
                    <section className={styles.grid} aria-label={t('storiesLabel')}>
                        {stories.map((story) => (
                            <article className={styles.card} key={story._id}>
                                <p className={styles.eyebrow}>{getStoryEyebrow(story)}</p>
                                <h2>{story.title}</h2>
                                <p className={styles.description}>{story.description}</p>
                                <p className={styles.status}>{getStoryStatusLabel(story)}</p>
                                <div className={styles.actions}>
                                    <Link to={`/stories/${story._id}`}>{t('view')}</Link>
                                    <button type="button" onClick={() => setEditingStory(story)}>{t('edit')}</button>
                                    <button className={styles.deleteButton} type="button" onClick={() => beginDelete(story)}>{t('delete')}</button>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>

            {showCreate && <AddStoryModal authorName={displayName} onClose={() => setShowCreate(false)} onSaved={refreshStories} />}
            {editingStory && <AddStoryModal story={editingStory} authorName={displayName} onClose={() => setEditingStory(null)} onSaved={refreshStories} />}
            {deletingStory && <StoryDeleteModal story={deletingStory} onClose={() => setDeletingStory(null)} onDeleted={handleStoryDeleted} />}
        </main>
    );
}

export default MyStoriesPage;
