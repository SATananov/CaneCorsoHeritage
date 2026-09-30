import { useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from './PreviewCard.module.css';
import actionStyles from './PreviewCardActions.module.css';

function PreviewCard(props) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'previewCard', key);
    const [showDetails, setShowDetails] = useState(false);
    const hasExternalDetails = typeof props.onDetails === 'function';
    const hasDeleteAction = typeof props.onDelete === 'function';

    const detailsClickHandler = () => {
        if (hasExternalDetails) {
            props.onDetails();
            return;
        }

        setShowDetails((currentValue) => !currentValue);
    };

    return (
        <article className="story-preview-card">
            <span>{props.eyebrow}</span>
            <h3>{props.title}</h3>
            <p>{props.description}</p>

            {!hasExternalDetails && showDetails && (
                <p className={styles.details}>{props.details}</p>
            )}

            <div className={actionStyles.actions}>
                <button
                    type="button"
                    aria-expanded={hasExternalDetails ? undefined : showDetails}
                    aria-label={`${hasExternalDetails || !showDetails ? t('detailsAbout') : t('hideDetailsAbout')} ${props.title}`}
                    onClick={detailsClickHandler}
                >
                    {hasExternalDetails ? t('details') : showDetails ? t('hideDetails') : t('details')}
                </button>

                {hasDeleteAction && (
                    <button
                        className={actionStyles.deleteButton}
                        type="button"
                        aria-label={`${t('deleteLabel')} ${props.title}`}
                        onClick={props.onDelete}
                    >
                        {t('delete')}
                    </button>
                )}
            </div>
        </article>
    );
}

export default PreviewCard;
