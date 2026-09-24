function MyStoriesPage() {
    return (
        <main className="route-page route-simple-page">
            <div className="site-container route-simple-shell">
                <p className="section-kicker">Private area</p>
                <h1>My Stories</h1>
                <p>
                    This protected route is ready for the future Supabase session. Once real
                    authentication is connected, signed-in members will reach their own stories here.
                </p>
            </div>
        </main>
    );
}

export default MyStoriesPage;
