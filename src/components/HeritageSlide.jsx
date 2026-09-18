function HeritageSlide(props) {
    const slideLabel = props.clone
        ? undefined
        : `${props.kicker}. ${props.title} ${props.text}`;

    return (
        <a
            className={`heritage-slide${props.clone ? ' heritage-slide-clone' : ''}`}
            href={props.clone ? undefined : props.href}
            aria-hidden={props.clone ? 'true' : undefined}
            aria-label={slideLabel}
            tabIndex={props.clone ? -1 : undefined}
        >
            <span
                className="heritage-slide-main-image"
                aria-hidden="true"
                style={{ backgroundImage: `url(${props.image})` }}
            ></span>

            {props.sideImage && (
                <span
                    className="heritage-slide-side-image"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${props.sideImage})` }}
                ></span>
            )}

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
