import { Navigate, Outlet, useLocation } from 'react-router';
import GuestAccessPrompt from '../components/GuestAccessPrompt';
import useAuth from '../hooks/useAuth';

function RequireAdmin() {
    const location = useLocation();
    const {
        user,
        loading,
        roleLoading,
        isAdmin,
        isActive,
    } = useAuth();

    if (loading || roleLoading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">Checking administrator access...</div>
            </main>
        );
    }

    if (!user) {
        return <GuestAccessPrompt location={location} admin />;
    }

    if (!isAdmin || !isActive) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAdmin;
