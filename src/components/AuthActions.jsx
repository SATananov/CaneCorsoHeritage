import { NavLink } from 'react-router';

function AuthActions(props) {
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
