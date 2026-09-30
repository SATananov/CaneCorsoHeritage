import { Navigate, Outlet, useLocation } from 'react-router';
import GuestAccessPrompt from '../components/GuestAccessPrompt';
import useAuth from '../hooks/useAuth';

function RequireAuth() {
    const location = useLocation();
    const { user, loading, roleLoading, isActive } = useAuth();

    if (loading || roleLoading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">Checking account...</div>
            </main>
        );
    }

    if (!user) {
        return <GuestAccessPrompt location={location} />;
    }

    if (!isActive) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAuth;
