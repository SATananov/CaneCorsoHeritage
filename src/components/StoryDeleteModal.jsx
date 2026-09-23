import { useState } from 'react';
import { deleteStory } from '../services/storyService';
import styles from './StoryDeleteModal.module.css';

function StoryDeleteModal({ story, onClose, onDeleted }) {
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteHandler = async () => {
        try {
            setError('');
            setIsDeleting(true);

            await deleteStory(story._id);
            await onDeleted();
            onClose();
        } catch {
            setError('Unable to delete the story right now.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-story-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <p className={styles.eyebrow}>Delete Story</p>
                <h2 id="delete-story-title">Remove this story?</h2>
                <p className={styles.storyTitle}>{story.title}</p>
                <p className={styles.message}>
                    This removes the Story from the local practice REST server.
                </p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <div className={styles.actions}>
                    <button type="button" onClick={onClose} disabled={isDeleting}>
                        Cancel
                    </button>
                    <button
                        className={styles.confirmButton}
                        type="button"
                        onClick={deleteHandler}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Story'}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default StoryDeleteModal;
