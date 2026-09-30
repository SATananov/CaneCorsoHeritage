import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import useAuth from '../hooks/useAuth';
import { fetchProfileById, getProfileAvatarUrl } from '../services/profileService';

function AuthActions(props) {
    const { user, loading, roleLoading, isAdmin, logout } = useAuth();
    const [profileState, setProfileState] = useState({
        userId: null,
        profile: null,
    });

    useEffect(() => {
        if (!user?.id) {
            return undefined;
        }

        const userId = user.id;
        const controller = new AbortController();

        fetchProfileById(userId, { signal: controller.signal })
            .then((profile) => {
                setProfileState({
                    userId,
                    profile,
                });
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setProfileState({
                        userId,
                        profile: null,
                    });
                }
            });

        return () => controller.abort();
    }, [user?.id]);

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
            || 'Member';

        const avatarUrl = getProfileAvatarUrl(profile);
        const initials = displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'U';

        return { displayName, avatarUrl, initials };
    }, [profile, user]);

    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            window.alert(error.message || 'Unable to sign out.');
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
                    My Profile
                </NavLink>
                <NavLink
                    className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                    to="/my-stories"
                >
                    My Stories
                </NavLink>
                <NavLink
                    className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                    to="/my-files"
                >
                    My Files
                </NavLink>
                {isAdmin && (
                    <NavLink
                        className={({ isActive }) => `login-button${isActive ? ' auth-route-active' : ''}`}
                        to="/admin"
                    >
                        Admin
                    </NavLink>
                )}
                {identity && (
                    <NavLink
                        className="signed-in-user"
                        to={`/users/${user.id}`}
                        aria-label={`Signed in as ${identity.displayName}`}
                    >
                        <span className="signed-in-user-avatar" aria-hidden="true">
                            {identity.avatarUrl ? (
                                <img src={identity.avatarUrl} alt="" />
                            ) : identity.initials}
                        </span>
                        <span className="signed-in-user-copy">
                            <strong>{identity.displayName}</strong>
                            <small>{isAdmin ? 'Administrator' : 'Member'}</small>
                        </span>
                    </NavLink>
                )}
                <button
                    className="register-button"
                    type="button"
                    onClick={handleLogout}
                >
                    Logout
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
                Login
            </NavLink>
            <NavLink
                className={({ isActive }) => `register-button${isActive ? ' auth-route-active' : ''}`}
                to="/register"
            >
                Register
            </NavLink>
        </div>
    );
}

export default AuthActions;
