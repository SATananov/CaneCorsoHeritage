function StoryCard(props) {
    return (
        <article className="story-card">
            <div className="story-card-top">
                <span className="story-category">{props.category}</span>
                <span className="story-meta">{props.meta}</span>
            </div>

            <p className="story-name">{props.name}</p>
            <h3>{props.title}</h3>
            <p className="story-description">{props.description}</p>

            <div className="story-card-footer">
                <span>Story preview</span>
                <span aria-hidden="true">→</span>
            </div>
        </article>
    );
}

export default StoryCard;
