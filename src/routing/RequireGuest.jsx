import { Navigate, Outlet } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';

function RequireGuest() {
    const { user, loading } = useAuth();
    const { language } = useLanguage();

    if (loading) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', 'checkingAccount')}
                </div>
            </main>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default RequireGuest;
