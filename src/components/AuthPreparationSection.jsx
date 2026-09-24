import { Link, useLocation } from 'react-router';
import styles from './AuthPreparationSection.module.css';

function AuthPreparationSection({ mode = 'both' }) {
    const location = useLocation();
    const showLogin = mode === 'both' || mode === 'login';
    const showRegister = mode === 'both' || mode === 'register';
    const guardedFrom = location.state?.from?.pathname;

    function preventSubmit(event) {
        event.preventDefault();
    }

    return (
        <section className={styles.authSection} aria-labelledby="account-access-title">
            <div className="site-container">
                <div className={styles.authShell}>
                    <div className={styles.authIntro}>
                        <p className={styles.eyebrow}>USG member access</p>
                        <h2 id="account-access-title">Your place inside Cane Corso Heritage.</h2>
                        <p>
                            Sign in to return to your account, or prepare a new profile for the
                            community features that will grow around Stories and Heritage.
                        </p>

                        {guardedFrom && mode === 'login' && (
                            <p className={styles.routeNotice}>
                                The route <strong>{guardedFrom}</strong> is protected. Real access
                                will become available when the Supabase session is connected.
                            </p>
                        )}

                        <div className={styles.brandMark} aria-hidden="true">
                            <img src="/images/logo.jpg" alt="" />
                            <div>
                                <strong>Cane Corso Heritage</strong>
                                <span>USG · Unico Suo Genere™</span>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.authGrid} ${mode !== 'both' ? styles.authGridSingle : ''}`}>
                        {showLogin && (
                            <article className={styles.authCard} id="login">
                                <div className={styles.cardHeading}>
                                    <span>01</span>
                                    <div>
                                        <p>Returning member</p>
                                        <h3>Login</h3>
                                    </div>
                                </div>

                                <form className={styles.authForm} onSubmit={preventSubmit}>
                                    <label>
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            name="loginEmail"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                        />
                                    </label>

                                    <label>
                                        <span>Password</span>
                                        <input
                                            type="password"
                                            name="loginPassword"
                                            autoComplete="current-password"
                                            placeholder="Your password"
                                        />
                                    </label>

                                    <button type="submit">Sign in</button>
                                </form>

                                <p className={styles.statusNote}>
                                    Supabase is not connected yet. No credentials are processed.
                                </p>

                                {mode === 'login' && (
                                    <Link className={styles.switchLink} to="/register">
                                        Need an account? Register
                                    </Link>
                                )}
                            </article>
                        )}

                        {showRegister && (
                            <article className={styles.authCard} id="register">
                                <div className={styles.cardHeading}>
                                    <span>02</span>
                                    <div>
                                        <p>New member</p>
                                        <h3>Register</h3>
                                    </div>
                                </div>

                                <form className={styles.authForm} onSubmit={preventSubmit}>
                                    <label>
                                        <span>Name</span>
                                        <input
                                            type="text"
                                            name="registerName"
                                            autoComplete="name"
                                            placeholder="Your name"
                                        />
                                    </label>

                                    <label>
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            name="registerEmail"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                        />
                                    </label>

                                    <label>
                                        <span>Password</span>
                                        <input
                                            type="password"
                                            name="registerPassword"
                                            autoComplete="new-password"
                                            placeholder="Create a password"
                                        />
                                    </label>

                                    <button type="submit">Create account</button>
                                </form>

                                <p className={styles.statusNote}>
                                    Registration is prepared visually. No account is created yet.
                                </p>

                                {mode === 'register' && (
                                    <Link className={styles.switchLink} to="/login">
                                        Already registered? Login
                                    </Link>
                                )}
                            </article>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AuthPreparationSection;
