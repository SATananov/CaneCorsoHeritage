import { Navigate, Outlet } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';

function RequireAdmin() {
    const { user, loading, roleLoading, isAdmin } = useAuth();
    const { language } = useLanguage();

    if (loading || roleLoading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', 'checkingAdmin')}
                </div>
            </main>
        );
    }

    if (!user || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAdmin;
