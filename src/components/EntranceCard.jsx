function EntranceCard(props) {
    return (
        <article className="entrance-card" id={props.sectionId}>
            <p className="entrance-card-eyebrow">{props.eyebrow}</p>
            <h3>{props.title}</h3>
            <p className="entrance-card-description">{props.description}</p>

            <div className="entrance-card-footer">
                <span>{props.note}</span>
                <span aria-hidden="true">→</span>
            </div>
        </article>
    );
}

export default EntranceCard;
