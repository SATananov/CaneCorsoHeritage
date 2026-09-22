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
            <p hidden={!showDetails}>{props.details}</p>
            <button
                type="button"
                aria-expanded={showDetails}
                aria-label={`Details about ${props.title}`}
                onClick={detailsClickHandler}
            >
                Details
            </button>
        </article>
    );
}

export default PreviewCard;
