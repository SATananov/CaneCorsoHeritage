import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchStoryById } from '../services/storyService';
import styles from './DetailsPage.module.css';

function StoryDetailsPage() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const [story, setStory] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadStory = async () => {
            try {
                const data = await fetchStoryById(storyId, { signal: controller.signal });
                setStory(data);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setError('Unable to load this story right now.');
                }
            }
        };

        loadStory();

        return () => {
            controller.abort();
        };
    }, [storyId]);

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/stories')}>
                    ← Back to Stories
                </button>

                {!story && !error && <LoadingSpinner label="Loading story details..." />}

                {error && (
                    <div className={styles.message} role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {story && (
                    <article className={styles.article}>
                        <p className={styles.eyebrow}>{story.eyebrow}</p>
                        <h1>{story.title}</h1>
                        <p className={styles.lead}>{story.description}</p>
                        <div className={styles.divider} />
                        <p className={styles.body}>{story.content ?? story.details}</p>

                        {story.author && (
                            <p className={styles.meta}>Story by <strong>{story.author}</strong></p>
                        )}
                    </article>
                )}
            </div>
        </main>
    );
}

export default StoryDetailsPage;
