import { useState } from 'react';
import styles from './PreviewCard.module.css';
import actionStyles from './PreviewCardActions.module.css';

function PreviewCard(props) {
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
                    aria-label={`${hasExternalDetails || !showDetails ? 'Details about' : 'Hide details about'} ${props.title}`}
                    onClick={detailsClickHandler}
                >
                    {hasExternalDetails ? 'Details' : showDetails ? 'Hide details' : 'Details'}
                </button>

                {hasDeleteAction && (
                    <button
                        className={actionStyles.deleteButton}
                        type="button"
                        aria-label={`Delete ${props.title}`}
                        onClick={props.onDelete}
                    >
                        Delete
                    </button>
                )}
            </div>
        </article>
    );
}

export default PreviewCard;
