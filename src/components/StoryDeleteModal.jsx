import { useRef, useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { getStoryDeleteCleanupWarning } from '../i18n/storyDeleteUi';
import { deleteStory } from '../services/storyService';
import styles from './StoryDeleteModal.module.css';

function StoryDeleteModal({ story, onClose, onDeleted }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDelete', key);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const deletingRef = useRef(false);

    const closeHandler = () => {
        if (!deletingRef.current) onClose();
    };

    const deleteHandler = async () => {
        if (deletingRef.current) return;
        deletingRef.current = true;
        try {
            setError('');
            setIsDeleting(true);
            await deleteStory(story._id);
            await onDeleted({
                storyId: story._id,
                cleanupWarning: '',
            });
            onClose();
        } catch (deleteError) {
            if (deleteError?.storyDeleteCommitted) {
                await onDeleted({
                    storyId: story._id,
                    cleanupWarning: getStoryDeleteCleanupWarning(language),
                });
                onClose();
                return;
            }

            setError(t('error'));
        } finally {
            deletingRef.current = false;
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={closeHandler}>
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
                    <button type="button" onClick={closeHandler} disabled={isDeleting}>
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
