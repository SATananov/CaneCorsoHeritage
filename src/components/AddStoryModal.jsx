import { useEffect, useState } from 'react';
import {
    syncStoryFilesVisibility,
    uploadUserFiles,
} from '../services/fileService';
import { createStory, updateStory } from '../services/storyService';
import styles from './AddStoryModal.module.css';

function getInitialForm(story) {
    return {
        visibility: story?.visibility ?? 'community',
        title: story?.title ?? '',
        description: story?.description ?? '',
        content: story?.content ?? '',
    };
}

function AddStoryModal({ story = null, authorName, onClose, onSaved }) {
    const [formData, setFormData] = useState(() => getInitialForm(story));
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = Boolean(story);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const changeHandler = (event) => {
        const { name, value } = event.target;

        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }));
    };

    const fileChangeHandler = (event) => {
        setSelectedFiles(Array.from(event.target.files ?? []));
        setError('');
    };

    const submitHandler = async (event) => {
        event.preventDefault();
        setError('');

        const storyData = {
            eyebrow: formData.visibility === 'community' ? 'Community' : 'My Own',
            visibility: formData.visibility,
            title: formData.title.trim(),
            description: formData.description.trim(),
            content: formData.content.trim(),
            author: authorName,
        };

        if (
            !storyData.title
            || !storyData.description
            || !storyData.content
            || !storyData.author
        ) {
            setError('Please complete all text fields.');
            return;
        }

        try {
            setIsSubmitting(true);

            const savedStory = isEditing
                ? await updateStory(story._id, storyData)
                : await createStory(storyData);

            if (isEditing) {
                await syncStoryFilesVisibility(savedStory._id, storyData.visibility);
            }

            if (selectedFiles.length > 0) {
                await uploadUserFiles(selectedFiles, {
                    storyId: savedStory._id,
                    visibility: storyData.visibility,
                });
            }

            await onSaved();
            onClose();
        } catch (submitError) {
            setError(submitError.message || 'Unable to save the story right now.');
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
                aria-labelledby="story-form-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    className={styles.closeButton}
                    type="button"
                    aria-label="Close story form"
                    onClick={onClose}
                >
                    ×
                </button>

                <div className={styles.heading}>
                    <p>{isEditing ? 'Edit Story' : 'Add Story'}</p>
                    <h2 id="story-form-title">
                        {isEditing ? 'Update your story.' : 'Share a new story.'}
                    </h2>
                    <span>
                        Choose who can see it, write the text and attach images, MP4 or TXT files.
                    </span>
                </div>

                <form className={styles.form} onSubmit={submitHandler}>
                    <div className={styles.formRow}>
                        <label>
                            Visibility
                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={changeHandler}
                                disabled={isSubmitting}
                            >
                                <option value="community">Community — visible to everyone</option>
                                <option value="private">My Own — only visible to me</option>
                            </select>
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
                    </div>

                    <label>
                        Short description
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            rows="1"
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
                            rows="3"
                            placeholder="Write the Story details."
                        />
                    </label>

                    <label className={styles.fileField}>
                        Attach files
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/mp4,text/plain,.txt"
                            onChange={fileChangeHandler}
                            disabled={isSubmitting}
                        />
                        <span>Images, MP4 and TXT · up to 50 MB per file</span>
                        <span>Attachments follow this Story visibility.</span>
                    </label>

                    {selectedFiles.length > 0 && (
                        <div className={styles.selectedFiles}>
                            {selectedFiles.map((file) => (
                                <span key={`${file.name}-${file.size}`}>{file.name}</span>
                            ))}
                        </div>
                    )}

                    <div className={styles.formFooter}>
                        <p className={styles.authorNote}>
                            Publishing as <strong>{authorName}</strong>
                        </p>

                        <div className={styles.actions}>
                            <button type="button" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? 'Saving...'
                                    : isEditing
                                        ? 'Save Changes'
                                        : 'Publish Story'}
                            </button>
                        </div>
                    </div>

                    {error && <p className={styles.error} role="alert">{error}</p>}
                </form>
            </section>
        </div>
    );
}

export default AddStoryModal;
