import { Navigate, Outlet } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';

function RequireAdmin() {
    const { user, loading, roleLoading, roleError, isAdmin, isActive } = useAuth();
    const { language } = useLanguage();

    if (loading || roleLoading || (user && roleError)) {
        const messageKey = user && roleError
            ? 'accountCheckError'
            : 'checkingAdmin';

        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', messageKey)}
                </div>
            </main>
        );
    }

    if (!user || !isAdmin || !isActive) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAdmin;
