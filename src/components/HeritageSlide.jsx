import { Link } from 'react-router';

function SlideContent(props) {
    return (
        <>
            <span
                className="heritage-slide-main-image"
                aria-hidden="true"
                style={{ backgroundImage: `url(${props.image})` }}
            />

            {props.sideImage && (
                <span
                    className="heritage-slide-side-image"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${props.sideImage})` }}
                />
            )}

            <span className="heritage-slide-overlay" aria-hidden="true" />

            <span className="heritage-slide-content">
                <span className="heritage-slide-kicker">{props.kicker}</span>
                <strong>{props.title}</strong>
                {!props.clone && (
                    <span className="heritage-slide-link">
                        Explore <span aria-hidden="true">→</span>
                    </span>
                )}
            </span>
        </>
    );
}

function HeritageSlide(props) {
    if (props.clone) {
        return (
            <div className="heritage-slide heritage-slide-clone" aria-hidden="true">
                <SlideContent {...props} />
            </div>
        );
    }

    return (
        <Link
            className="heritage-slide"
            to={props.to}
            aria-label={`${props.kicker}. ${props.title}`}
        >
            <SlideContent {...props} />
        </Link>
    );
}

export default HeritageSlide;
