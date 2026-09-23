import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { fetchStoryById } from '../services/storyService';
import styles from './StoryDetailsModal.module.css';

function StoryDetailsModal({ storyId, onClose }) {
    const [story, setStory] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let isActive = true;

        const loadStory = async () => {
            try {
                const data = await fetchStoryById(storyId);

                if (isActive) {
                    setStory(data);
                }
            } catch {
                if (isActive) {
                    setError('Unable to load this story right now.');
                }
            }
        };

        loadStory();

        return () => {
            isActive = false;
        };
    }, [storyId]);

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="story-details-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    className={styles.closeButton}
                    type="button"
                    aria-label="Close story details"
                    onClick={onClose}
                >
                    ×
                </button>

                {!story && !error && <LoadingSpinner label="Loading story details..." />}

                {error && (
                    <div className={styles.message} role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={onClose}>Close</button>
                    </div>
                )}

                {story && (
                    <div className={styles.content}>
                        <p className={styles.eyebrow}>{story.eyebrow}</p>
                        <h2 id="story-details-title">{story.title}</h2>
                        <p className={styles.description}>{story.description}</p>
                        <p className={styles.body}>{story.content ?? story.details}</p>

                        {story.author && (
                            <p className={styles.author}>Story by {story.author}</p>
                        )}

                        <button className={styles.actionButton} type="button" onClick={onClose}>
                            Close
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

export default StoryDetailsModal;
