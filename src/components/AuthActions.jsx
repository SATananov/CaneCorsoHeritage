import { NavLink } from 'react-router';
import useAuth from '../hooks/useAuth';

function AuthActions(props) {
    const { user, loading, logout } = useAuth();

    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            window.alert(error.message || 'Unable to sign out.');
        }
    }

    if (loading) {
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
