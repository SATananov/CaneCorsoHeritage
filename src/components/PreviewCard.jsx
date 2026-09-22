import { useState } from 'react';

function PreviewCard(props) {
    const [showDetails, setShowDetails] = useState(false);

    const detailsClickHandler = () => {
        setShowDetails((currentValue) => !currentValue);
    };

    return (
        <article className="story-preview-card">
            <span>{props.eyebrow}</span>
            <h3>{props.title}</h3>
            <p>{props.description}</p>

            {showDetails && <p>{props.details}</p>}

            <button
                type="button"
                aria-expanded={showDetails}
                aria-label={`${showDetails ? 'Hide details about' : 'Details about'} ${props.title}`}
                onClick={detailsClickHandler}
            >
                {showDetails ? 'Hide details' : 'Details'}
            </button>
        </article>
    );
}

export default PreviewCard;
