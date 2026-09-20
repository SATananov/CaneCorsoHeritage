function EntranceCard(props) {
    return (
        <a className="entrance-card" href={props.href}>
            <p className="entrance-card-eyebrow">{props.eyebrow}</p>
            <h3>{props.title}</h3>

            {props.imagePath ? (
                <div className="entrance-card-media">
                    <img src={props.imagePath} alt={props.imageAlt || ''} />
                </div>
            ) : null}

            <div className="entrance-card-footer">
                <span>{props.note}</span>
                <span aria-hidden="true">→</span>
            </div>
        </a>
    );
}

export default EntranceCard;
