import { useNavigate } from 'react-router';

function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <main className="route-page route-simple-page">
            <div className="site-container route-simple-shell">
                <p className="section-kicker">404</p>
                <h1>Page not found.</h1>
                <p>The address does not match a page in Cane Corso Heritage.</p>
                <button className="route-primary-action" type="button" onClick={() => navigate('/')}>
                    Back to Home
                </button>
            </div>
        </main>
    );
}

export default NotFoundPage;
