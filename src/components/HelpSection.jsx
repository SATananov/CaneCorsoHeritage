import AuthActions from './AuthActions';

function HelpSection() {
    return (
        <section className="visitor-section visitor-section-alt" id="help" aria-labelledby="help-title">
            <div className="site-container">
                <div className="visitor-section-heading">
                    <p className="section-kicker">Help</p>
                    <h2 id="help-title">Explore first. Join when you are ready.</h2>
                    <p>
                        Browse Stories, Heritage and About USG freely. Create an account when you
                        want to share and manage your own stories.
                    </p>
                </div>

                <div className="help-grid">
                    <article className="help-card">
                        <span>01</span>
                        <h3>Explore</h3>
                        <p>Start from Home and discover Stories, Heritage and About USG.</p>
                    </article>

                    <article className="help-card">
                        <span>02</span>
                        <h3>Read</h3>
                        <p>Open the content that interests you and learn more about Cane Corso.</p>
                    </article>

                    <article className="help-card help-card-join">
                        <span>03</span>
                        <h3>Join</h3>
                        <p>Create an account when you want to share your own stories.</p>
                        <AuthActions className="help-auth-actions" ariaLabel="Join options" />
                    </article>
                </div>
            </div>
        </section>
    );
}

export default HelpSection;
