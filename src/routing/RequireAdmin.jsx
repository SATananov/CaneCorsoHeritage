import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hooks/useAuth';

function RequireAdmin() {
    const location = useLocation();
    const { user, loading, roleLoading, isAdmin } = useAuth();

    if (loading || roleLoading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">Checking administrator access...</div>
            </main>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAdmin;
