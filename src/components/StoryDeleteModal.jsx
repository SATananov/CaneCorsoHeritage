import { useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { deleteStory } from '../services/storyService';
import styles from './StoryDeleteModal.module.css';

function StoryDeleteModal({ story, onClose, onDeleted }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDelete', key);
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
            setError(t('error'));
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
                <p className={styles.eyebrow}>{t('kicker')}</p>
                <h2 id="delete-story-title">{t('title')}</h2>
                <p className={styles.storyTitle}>{story.title}</p>
                <p className={styles.message}>{t('copy')}</p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <div className={styles.actions}>
                    <button type="button" onClick={onClose} disabled={isDeleting}>
                        {t('cancel')}
                    </button>
                    <button
                        className={styles.confirmButton}
                        type="button"
                        onClick={deleteHandler}
                        disabled={isDeleting}
                    >
                        {isDeleting ? t('deleting') : t('delete')}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default StoryDeleteModal;
