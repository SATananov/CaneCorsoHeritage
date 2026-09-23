import { useState } from 'react';
import { createStory } from '../services/storyService';
import styles from './AddStoryModal.module.css';

const initialForm = {
    eyebrow: 'Community',
    title: '',
    description: '',
    content: '',
    author: '',
};

function AddStoryModal({ onClose, onCreated }) {
    const [formData, setFormData] = useState(initialForm);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const changeHandler = (event) => {
        const { name, value } = event.target;

        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }));
    };

    const submitHandler = async (event) => {
        event.preventDefault();
        setError('');

        const storyData = {
            eyebrow: formData.eyebrow.trim(),
            title: formData.title.trim(),
            description: formData.description.trim(),
            content: formData.content.trim(),
            author: formData.author.trim(),
        };

        if (
            !storyData.eyebrow ||
            !storyData.title ||
            !storyData.description ||
            !storyData.content ||
            !storyData.author
        ) {
            setError('Please complete all fields.');
            return;
        }

        try {
            setIsSubmitting(true);
            await createStory(storyData);
            await onCreated();
            onClose();
        } catch {
            setError('Unable to create the story right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-story-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    className={styles.closeButton}
                    type="button"
                    aria-label="Close add story"
                    onClick={onClose}
                >
                    ×
                </button>

                <div className={styles.heading}>
                    <p>Add Story</p>
                    <h2 id="add-story-title">Share a new story.</h2>
                    <span>
                        Share an experience, memory or moment that belongs in the Cane Corso
                        Heritage stories.
                    </span>
                </div>

                <form className={styles.form} onSubmit={submitHandler}>
                    <label>
                        Category
                        <input
                            name="eyebrow"
                            value={formData.eyebrow}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                        />
                    </label>

                    <label>
                        Title
                        <input
                            name="title"
                            value={formData.title}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            placeholder="A story worth preserving"
                        />
                    </label>

                    <label>
                        Short description
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            rows="3"
                            placeholder="A short introduction for the Story card."
                        />
                    </label>

                    <label>
                        Story
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            rows="6"
                            placeholder="Write the Story details."
                        />
                    </label>

                    <label>
                        Author
                        <input
                            name="author"
                            value={formData.author}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            placeholder="Your name"
                        />
                    </label>

                    {error && <p className={styles.error} role="alert">{error}</p>}

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Add Story'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default AddStoryModal;
