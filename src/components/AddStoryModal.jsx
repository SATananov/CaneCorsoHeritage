import { useEffect, useRef, useState } from 'react';
import {
    syncStoryFilesVisibility,
    uploadUserFiles,
} from '../services/fileService';
import { createStory, updateStory } from '../services/storyService';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from './AddStoryModal.module.css';

function getInitialForm(story, language) {
    return {
        visibility: story?.visibility ?? 'community',
        originalLanguage: story?.original_language ?? language,
        title: story?.title ?? '',
        description: story?.description ?? '',
        content: story?.content ?? '',
    };
}

function AddStoryModal({ story = null, authorName, onClose, onSaved }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyForm', key);
    const [formData, setFormData] = useState(() => getInitialForm(story, language));
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const createdStoryRef = useRef(null);
    const submittingRef = useRef(false);
    const uploadedFilesRef = useRef([]);
    const isEditing = Boolean(story);
    const currentUploads = uploadedFiles.filter((upload) => !story || upload.storyId === story._id);
    const pendingFiles = selectedFiles.filter((file) => !currentUploads.some((upload) => upload.file === file));

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
        if (submittingRef.current) return;
        setError('');

        const storyData = {
            eyebrow: formData.visibility === 'community' ? 'Community' : 'My Own',
            visibility: formData.visibility,
            original_language: formData.originalLanguage,
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
            setError(t('requiredError'));
            return;
        }

        try {
            submittingRef.current = true;
            setIsSubmitting(true);

            const existingStory = story ?? createdStoryRef.current;
            const savedStory = existingStory
                ? await updateStory(existingStory._id, storyData)
                : await createStory(storyData);

            // Keep the saved identity even if attachments or completion fail.
            if (!isEditing) createdStoryRef.current = savedStory;

            if (existingStory) {
                await syncStoryFilesVisibility(savedStory._id, storyData.visibility);
            }

            for (const file of selectedFiles) {
                // File references identify this selection without filename collisions.
                // Selecting a file again creates a new attachment; retries reuse it.
                if (uploadedFilesRef.current.some((upload) => (
                    upload.file === file && upload.storyId === savedStory._id
                ))) continue;

                await uploadUserFiles([file], {
                    storyId: savedStory._id,
                    visibility: storyData.visibility,
                });
                // Record only after both storage and metadata have succeeded.
                uploadedFilesRef.current = [...uploadedFilesRef.current, { file, storyId: savedStory._id }];
                setUploadedFiles(uploadedFilesRef.current);
            }

            await onSaved();
            onClose();
        } catch {
            setError(t('saveError'));
        } finally {
            submittingRef.current = false;
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
                    aria-label={t('close')}
                    onClick={onClose}
                >
                    ×
                </button>

                <div className={styles.heading}>
                    <p>{isEditing ? t('editKicker') : t('addKicker')}</p>
                    <h2 id="story-form-title">
                        {isEditing ? t('editTitle') : t('addTitle')}
                    </h2>
                    <span>
                        {t('intro')}
                    </span>
                </div>

                <form className={styles.form} onSubmit={submitHandler}>
                    <div className={styles.formRow}>
                        <label>
                            {t('visibility')}
                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={changeHandler}
                                disabled={isSubmitting}
                            >
                                <option value="community">{t('community')}</option>
                                <option value="private">{t('private')}</option>
                            </select>
                        </label>

                        <label>
                            {t('title')}
                            <input
                                name="title"
                                value={formData.title}
                                onChange={changeHandler}
                                disabled={isSubmitting}
                                placeholder={t('titlePlaceholder')}
                            />
                        </label>
                    </div>

                    <label>
                        {t('originalLanguage')}
                        <select
                            name="originalLanguage"
                            value={formData.originalLanguage}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                        >
                            <option value="en">{t('languageEnglish')}</option>
                            <option value="bg">{t('languageBulgarian')}</option>
                            <option value="it">{t('languageItalian')}</option>
                        </select>
                        <span>{t('languageHint')}</span>
                    </label>

                    <label>
                        {t('shortDescription')}
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            rows="1"
                            placeholder={t('descriptionPlaceholder')}
                        />
                    </label>

                    <label>
                        {t('story')}
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={changeHandler}
                            disabled={isSubmitting}
                            rows="3"
                            placeholder={t('storyPlaceholder')}
                        />
                    </label>

                    <label className={styles.fileField}>
                        {t('attachFiles')}
                        <input
                            type="file"
                            multiple
                            accept="image/*,audio/*,video/mp4,text/*,.txt,.md,.csv,.tsv,.json,.xml,.rtf,.pdf,.doc,.docx,.odt"
                            onChange={fileChangeHandler}
                            disabled={isSubmitting}
                        />
                        <span>{t('fileHint')}</span>
                        <span>{t('attachmentVisibility')}</span>
                    </label>

                    {pendingFiles.length > 0 && (
                        <div className={styles.selectedFiles}>
                            {pendingFiles.map((file, index) => (
                                <span key={index}>{file.name}</span>
                            ))}
                        </div>
                    )}

                    {currentUploads.length > 0 && (
                        <div className={styles.selectedFiles} role="status">
                            <strong>{getTranslation(language, 'storyDetails', 'attachedFiles')}</strong>
                            {currentUploads.map(({ file }, index) => (
                                <span key={index}>{file.name}</span>
                            ))}
                        </div>
                    )}

                    <div className={styles.formFooter}>
                        <p className={styles.authorNote}>
                            {t('publishingAs')} <strong>{authorName}</strong>
                        </p>

                        <div className={styles.actions}>
                            <button type="button" onClick={onClose} disabled={isSubmitting}>
                                {t('cancel')}
                            </button>
                            <button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? t('saving')
                                    : isEditing
                                        ? t('update')
                                        : t('publish')}
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
