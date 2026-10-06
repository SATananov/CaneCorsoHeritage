import { Navigate, Outlet } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';

function RequireAdmin() {
    const { user, profile, loading } = useAuth();
    const { language } = useLanguage();

    if (loading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', 'checkingAdmin')}
                </div>
            </main>
        );
    }

    if (!user || profile?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireAdmin;
