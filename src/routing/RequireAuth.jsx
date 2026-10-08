import { Navigate, Outlet, useLocation } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';

function RequireAuth() {
    const { user, loading, roleLoading, isActive } = useAuth();
    const location = useLocation();
    const { language } = useLanguage();

    if (loading || roleLoading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', 'checkingAccount')}
                </div>
            </main>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!isActive) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAuth;
