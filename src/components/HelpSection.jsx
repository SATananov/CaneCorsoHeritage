import { Link } from 'react-router';

function HelpSection() {
    return (
        <section className="visitor-section visitor-section-alt" aria-labelledby="help-title">
            <div className="site-container">
                <div className="visitor-section-heading" id="help">
                    <p className="section-kicker">Help</p>
                    <h2 id="help-title">Explore, read and share.</h2>
                    <p>
                        Browse Stories, Heritage and About USG. Open the content that interests you
                        and share a story when you have something worth preserving.
                    </p>
                </div>

                <div className="help-grid">
                    <article className="help-card">
                        <span>01</span>
                        <h3>Explore</h3>
                        <p>Start from Home and discover Stories, Heritage and About USG.</p>
                        <Link className="help-topic-link" to="/help/explore">Explore help →</Link>
                    </article>

                    <article className="help-card">
                        <span>02</span>
                        <h3>Read</h3>
                        <p>Open any Story or Heritage card to discover the full details.</p>
                        <Link className="help-topic-link" to="/help/read">Reading help →</Link>
                    </article>

                    <article className="help-card help-card-join">
                        <span>03</span>
                        <h3>Share</h3>
                        <p>
                            Add a story to the collection and preserve meaningful Cane Corso
                            experiences.
                        </p>
                        <Link className="help-topic-link" to="/help/share">Sharing help →</Link>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default HelpSection;
