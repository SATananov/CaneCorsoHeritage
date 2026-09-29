import { Navigate, Outlet } from 'react-router';
import useAuth from '../hooks/useAuth';

function RequireGuest() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">Checking account...</div>
            </main>
        );
    }

    if (user) {
        return <Navigate to="/my-stories" replace />;
    }

    return <Outlet />;
}

export default RequireGuest;
