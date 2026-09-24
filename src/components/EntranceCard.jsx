import { Link } from 'react-router';

function EntranceCard(props) {
    return (
        <Link className="entrance-card" to={props.to}>
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
        </Link>
    );
}

export default EntranceCard;
