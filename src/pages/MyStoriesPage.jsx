import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AddStoryModal from '../components/AddStoryModal';
import LoadingSpinner from '../components/LoadingSpinner';
import StoryDeleteModal from '../components/StoryDeleteModal';
import useAuth from '../hooks/useAuth';
import { fetchMyStories } from '../services/storyService';
import styles from './MyStoriesPage.module.css';

function MyStoriesPage() {
    const { user } = useAuth();
    const displayName = user?.user_metadata?.display_name || 'USG Member';
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editingStory, setEditingStory] = useState(null);
    const [deletingStory, setDeletingStory] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadInitialStories() {
            try {
                const data = await fetchMyStories(user.id, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setStories(data);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && !controller.signal.aborted) {
                    setError(loadError.message || 'Unable to load your stories.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        loadInitialStories();

        return () => {
            controller.abort();
        };
    }, [user.id]);

    async function refreshStories() {
        try {
            setError('');
            const data = await fetchMyStories(user.id);
            setStories(data);
        } catch (loadError) {
            setError(loadError.message || 'Unable to refresh your stories.');
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <section className={styles.heading}>
                    <div>
                        <p className="section-kicker">Private area</p>
                        <h1>My Stories</h1>
                        <p>
                            Signed in as <strong>{displayName}</strong>. Keep a Story for yourself or
                            share it with the Community.
                        </p>
                    </div>

                    <div className={styles.headingActions}>
                        <Link to="/my-files">My Files</Link>
                        <button type="button" onClick={() => setShowCreate(true)}>
                            + Add Story
                        </button>
                    </div>
                </section>

                {isLoading && <LoadingSpinner label="Loading your stories..." />}

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!isLoading && !error && stories.length === 0 && (
                    <section className={styles.emptyState}>
                        <p className="section-kicker">Your collection</p>
                        <h2>No stories yet.</h2>
                        <p>Your first Story can be private or shared with the Community.</p>
                        <button type="button" onClick={() => setShowCreate(true)}>
                            Add your first Story
                        </button>
                    </section>
                )}

                {!isLoading && !error && stories.length > 0 && (
                    <section className={styles.grid} aria-label="Your stories">
                        {stories.map((story) => {
                            const isPrivate = story.visibility === 'private';

                            return (
                                <article className={styles.card} key={story._id}>
                                    <p className={styles.eyebrow}>{story.eyebrow}</p>
                                    <h2>{story.title}</h2>
                                    <p className={styles.description}>{story.description}</p>
                                    <p className={styles.status}>
                                        {isPrivate ? 'My Own · Private' : 'Community · Public'}
                                    </p>

                                    <div className={styles.actions}>
                                        <Link to={`/stories/${story._id}`}>View</Link>
                                        <button type="button" onClick={() => setEditingStory(story)}>
                                            Edit
                                        </button>
                                        <button
                                            className={styles.deleteButton}
                                            type="button"
                                            onClick={() => setDeletingStory(story)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>

            {showCreate && (
                <AddStoryModal
                    authorName={displayName}
                    onClose={() => setShowCreate(false)}
                    onSaved={refreshStories}
                />
            )}

            {editingStory && (
                <AddStoryModal
                    story={editingStory}
                    authorName={displayName}
                    onClose={() => setEditingStory(null)}
                    onSaved={refreshStories}
                />
            )}

            {deletingStory && (
                <StoryDeleteModal
                    story={deletingStory}
                    onClose={() => setDeletingStory(null)}
                    onDeleted={refreshStories}
                />
            )}
        </main>
    );
}

export default MyStoriesPage;
