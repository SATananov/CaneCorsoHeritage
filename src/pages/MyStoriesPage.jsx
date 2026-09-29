import useAuth from '../hooks/useAuth';

function MyStoriesPage() {
    const { user } = useAuth();
    const displayName = user?.user_metadata?.display_name || user?.email || 'Member';

    return (
        <main className="route-page route-simple-page">
            <div className="site-container route-simple-shell">
                <p className="section-kicker">Private area</p>
                <h1>My Stories</h1>
                <p>
                    Signed in as <strong>{displayName}</strong>.
                </p>
                <p>
                    Your private story workspace is ready. Creating, editing and deleting your own
                    stories will be connected in the next write milestone.
                </p>
            </div>
        </main>
    );
}

export default MyStoriesPage;
