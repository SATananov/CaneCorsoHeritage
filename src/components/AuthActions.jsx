function AuthActions(props) {
    return (
        <div className={props.className} role="group" aria-label={props.ariaLabel}>
            <button className="login-button" type="button">
                Login
            </button>
            <button className="register-button" type="button">
                Register
            </button>
        </div>
    );
}

export default AuthActions;
