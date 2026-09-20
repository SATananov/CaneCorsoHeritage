function PreviewCard(props) {
    return (
        <article className="story-preview-card">
            <span>{props.eyebrow}</span>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
            <button type="button" aria-label={`Details about ${props.title}`}>
                Details
            </button>
        </article>
    );
}

export default PreviewCard;
