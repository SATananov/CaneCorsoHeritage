function HeritageSlide(props) {
    return (
        <a
            className={`heritage-slide${props.clone ? ' heritage-slide-clone' : ''}`}
            href={props.clone ? undefined : props.href}
            aria-hidden={props.clone ? 'true' : undefined}
            tabIndex={props.clone ? -1 : undefined}
        >
            <img src={props.image} alt={props.clone ? '' : props.alt} />

            <span className="heritage-slide-overlay" aria-hidden="true"></span>

            <span className="heritage-slide-content">
                <span className="heritage-slide-kicker">{props.kicker}</span>
                <strong>{props.title}</strong>
                <span className="heritage-slide-text">{props.text}</span>
                {!props.clone && (
                    <span className="heritage-slide-link">
                        Explore <span aria-hidden="true">→</span>
                    </span>
                )}
            </span>
        </a>
    );
}

export default HeritageSlide;
