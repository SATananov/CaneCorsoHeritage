import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';
import { fetchOwnPrivateProfileDetails } from '../services/profileService';

const requiredProfileFields = ['first_name', 'last_name', 'country', 'city'];

function getReturnDestination(from) {
    let destination;
    if (typeof from === 'string') {
        destination = from;
    } else if (from && typeof from.pathname === 'string' && !Array.isArray(from)) {
        const { pathname, search = '', hash = '' } = from;
        if (
            /[?#]/.test(pathname)
            || typeof search !== 'string' || (search && !search.startsWith('?'))
            || typeof hash !== 'string' || (hash && !hash.startsWith('#'))
        ) return '/';
        destination = `${pathname}${search}${hash}`;
    } else {
        return '/';
    }

    try {
        const decoded = decodeURIComponent(destination);
        if (
            !/^\/(?!\/)/.test(destination) || !/^\/(?!\/)/.test(decoded)
            || /\s/.test(destination)
            || [...decoded].some((char) => char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
        ) return '/';

        const url = new URL(destination, 'https://app.invalid');
        if (url.origin !== 'https://app.invalid' || !/^\/(?!\/)/.test(url.pathname)) return '/';
        const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
        // Returning to a guest-only page would start another redirect decision.
        if (pathname === '/login' || pathname === '/register') return '/';
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return '/';
    }
}

function RequireGuest() {
    const { user, loading } = useAuth();
    const { language } = useLanguage();
    const location = useLocation();
    const [profileCheck, setProfileCheck] = useState(null);

    useEffect(() => {
        if (loading || !user?.id) return undefined;
        const authUser = user;
        const userId = authUser.id;
        const controller = new AbortController();

        async function checkProfile() {
            let complete = false;
            try {
                const details = await fetchOwnPrivateProfileDetails(userId, { signal: controller.signal });
                complete = requiredProfileFields.every((field) => details?.[field]?.trim());
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.warn('Unable to verify profile completion after login.', error);
                }
            }
            if (!controller.signal.aborted) setProfileCheck({ authUser, userId, complete });
        }

        checkProfile();
        return () => controller.abort();
    }, [loading, user]);

    if (loading || (user && (profileCheck?.userId !== user.id || profileCheck?.authUser !== user))) {
        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', 'checkingAccount')}
                </div>
            </main>
        );
    }

    if (user) {
        const destination = profileCheck.complete
            ? getReturnDestination(location.state?.from)
            : `/users/${user.id}`;
        return <Navigate to={destination} replace />;
    }

    return <Outlet />;
}

export default RequireGuest;
