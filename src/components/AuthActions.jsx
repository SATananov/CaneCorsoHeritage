import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchProfileById, getProfileAvatarUrl } from '../services/profileService';
import { subscribeProfileRefresh } from '../services/profileRefresh';
import { fetchPendingModerationCount } from '../services/adminService';

function AuthActions(props) {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'account', key),
        [language],
    );
    const { user, loading, roleLoading, roleError, isAdmin, isActive, logout } = useAuth();
    const [profileState, setProfileState] = useState({
        userId: null,
        profile: null,
    });
    const [pendingModerationCount, setPendingModerationCount] = useState(0);

    useEffect(() => {
        if (!user?.id) {
            return undefined;
        }

        const userId = user.id;
        let activeController;

        async function loadProfile() {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;

            try {
                const profile = await fetchProfileById(userId, { signal: controller.signal });
                if (!controller.signal.aborted) {
                    setProfileState({ userId, profile });
                }
            } catch (error) {
                if (!controller.signal.aborted && error?.name !== 'AbortError') {
                    setProfileState({
                        userId,
                        profile: null,
                    });
                }
            }
        }

        loadProfile();
        const unsubscribe = subscribeProfileRefresh(userId, loadProfile);

        return () => {
            unsubscribe();
            activeController?.abort();
        };
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id || !isAdmin || !isActive) {
            return undefined;
        }

        let activeController;

        async function loadPendingModerationCount() {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;

            try {
                const count = await fetchPendingModerationCount({
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setPendingModerationCount(count);
                }
            } catch (error) {
                if (!controller.signal.aborted && error?.name !== 'AbortError') {
                    setPendingModerationCount(0);
                }
            }
        }

        loadPendingModerationCount();

        const handleWindowFocus = () => {
            loadPendingModerationCount();
        };

        window.addEventListener('focus', handleWindowFocus);
        const intervalId = window.setInterval(loadPendingModerationCount, 30000);

        return () => {
            activeController?.abort();
            window.removeEventListener('focus', handleWindowFocus);
            window.clearInterval(intervalId);
        };
    }, [user?.id, isAdmin, isActive]);
    const profile = profileState.userId === user?.id
        ? profileState.profile
        : null;

    const identity = useMemo(() => {
        if (!user) {
            return null;
        }

        const displayName = profile?.display_name?.trim()
            || profile?.username?.trim()
            || user.user_metadata?.display_name?.trim()
            || user.user_metadata?.username?.trim()
            || user.email?.split('@')[0]
            || t('member');

        const avatarUrl = getProfileAvatarUrl(profile);
        const initials = displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'U';

        return { displayName, avatarUrl, initials };
    }, [profile, user, t]);

    async function handleLogout() {
        try {
            await logout();
            navigate('/', { replace: true });
        } catch {
            window.alert(t('logoutError'));
        }
    }

    if (loading || roleLoading) {
        return null;
    }

    if (user) {
        return (
            <div className={props.className} role="group" aria-label={props.ariaLabel}>
                <NavLink
                    className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                    to={`/users/${user.id}`}
                >
                    {t('myProfile')}
                </NavLink>
                <NavLink
                    className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                    to="/my-stories"
                >
                    {t('myStories')}
                </NavLink>
                <NavLink
                    className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                    to="/my-files"
                >
                    {t('myFiles')}
                </NavLink>
                {isAdmin && (
                    <NavLink
                        className={({ isActive }) => `login-button admin-nav-link${isActive ? ' auth-route-active' : ''}`}
                        to="/admin"
                        aria-label={pendingModerationCount > 0
                            ? `${t('admin')} (${pendingModerationCount})`
                            : t('admin')}
                    >
                        <span>{t('admin')}</span>
                        {pendingModerationCount > 0 && (
                            <span className="admin-pending-badge" aria-hidden="true">
                                {pendingModerationCount > 99 ? '99+' : pendingModerationCount}
                            </span>
                        )}
                    </NavLink>
                )}
                {identity && (
                    <NavLink
                        className="signed-in-user"
                        to={`/users/${user.id}`}
                        aria-label={`${t('signedInAs')} ${identity.displayName}`}
                    >
                        <span className="signed-in-user-avatar" aria-hidden="true">
                            {identity.avatarUrl ? (
                                <img src={identity.avatarUrl} alt="" />
                            ) : identity.initials}
                        </span>
                        <span className="signed-in-user-copy">
                            <strong>{identity.displayName}</strong>
                            <small>
                                {roleError
                                    ? t('statusUnavailable')
                                    : !isActive
                                        ? t('inactive')
                                        : isAdmin
                                            ? t('administrator')
                                            : t('member')}
                            </small>
                        </span>
                    </NavLink>
                )}
                <button
                    className="register-button"
                    type="button"
                    onClick={handleLogout}
                >
                    {t('logout')}
                </button>
            </div>
        );
    }

    return (
        <div className={props.className} role="group" aria-label={props.ariaLabel}>
            <NavLink
                className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                to="/login"
            >
                {t('login')}
            </NavLink>
            <NavLink
                className={({ isActive }) => `register-button${isActive ? ' auth-route-active' : ''}`}
                to="/register"
            >
                {t('register')}
            </NavLink>
        </div>
    );
}

export default AuthActions;
