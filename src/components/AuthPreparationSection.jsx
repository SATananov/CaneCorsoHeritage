import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import useAuth from '../hooks/useAuth';
import styles from './AuthPreparationSection.module.css';

function AuthPreparationSection({ mode = 'login' }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, register } = useAuth();

    const isLogin = mode === 'login';
    const guardedFrom = location.state?.from;

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));

        setErrorMessage('');
        setSuccessMessage('');
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const displayName = formData.displayName.trim();
        const email = formData.email.trim();
        const password = formData.password;

        if (!email || !password) {
            setErrorMessage('Email and password are required.');
            return;
        }

        if (!isLogin && displayName.length < 2) {
            setErrorMessage('Name must be at least 2 characters.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            if (isLogin) {
                await login(email, password);

                const returnPath = guardedFrom
                    ? `${guardedFrom.pathname}${guardedFrom.search || ''}`
                    : '/my-stories';

                navigate(returnPath, { replace: true });
                return;
            }

            const data = await register(displayName, email, password);

            if (data.session) {
                navigate('/my-stories', { replace: true });
                return;
            }

            setSuccessMessage(
                'Account created. Check your email if Supabase asks you to confirm the registration.',
            );
            setFormData((current) => ({
                ...current,
                password: '',
            }));
        } catch (error) {
            const message = error?.message || '';

            if (message === 'Failed to fetch') {
                setErrorMessage('Connection problem. Please try again.');
            } else if (message === 'Invalid login credentials') {
                setErrorMessage('Incorrect email or password.');
            } else if (message === 'Email not confirmed') {
                setErrorMessage('Please confirm your email before signing in.');
            } else {
                setErrorMessage(message || 'Unable to continue right now.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className={styles.authSection} aria-labelledby="account-access-title">
            <div className="site-container">
                <div className={styles.authShell}>
                    <div className={styles.authIntro}>
                        <p className={styles.eyebrow}>USG member access</p>
                        <h2 id="account-access-title">
                            {isLogin ? 'Welcome back.' : 'Join Cane Corso Heritage.'}
                        </h2>
                        <p>
                            {isLogin
                                ? 'Sign in to reach your private member area and continue your work.'
                                : 'Create your member profile with a name, email and password.'}
                        </p>

                        {guardedFrom && isLogin && (
                            <p className={styles.routeNotice}>
                                Sign in to continue to <strong>{guardedFrom.pathname}</strong>.
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

                    <div className={`${styles.authGrid} ${styles.authGridSingle}`}>
                        <article className={styles.authCard}>
                            <div className={styles.cardHeading}>
                                <span>{isLogin ? '01' : '02'}</span>
                                <div>
                                    <p>{isLogin ? 'Returning member' : 'New member'}</p>
                                    <h3>{isLogin ? 'Login' : 'Register'}</h3>
                                </div>
                            </div>

                            <form className={styles.authForm} onSubmit={handleSubmit}>
                                {!isLogin && (
                                    <label>
                                        <span>Name</span>
                                        <input
                                            type="text"
                                            name="displayName"
                                            autoComplete="name"
                                            placeholder="Your name"
                                            value={formData.displayName}
                                            onChange={handleChange}
                                            disabled={submitting}
                                        />
                                    </label>
                                )}

                                <label>
                                    <span>Email</span>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                </label>

                                <label>
                                    <span>Password</span>
                                    <input
                                        type="password"
                                        name="password"
                                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        placeholder={isLogin ? 'Your password' : 'Create a password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                </label>

                                <button type="submit" disabled={submitting}>
                                    {submitting
                                        ? isLogin
                                            ? 'Signing in...'
                                            : 'Creating account...'
                                        : isLogin
                                            ? 'Sign in'
                                            : 'Create account'}
                                </button>
                            </form>

                            {errorMessage && (
                                <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                    {errorMessage}
                                </p>
                            )}

                            {successMessage && (
                                <p
                                    className={`${styles.formMessage} ${styles.formSuccess}`}
                                    aria-live="polite"
                                >
                                    {successMessage}
                                </p>
                            )}

                            <Link
                                className={styles.switchLink}
                                to={isLogin ? '/register' : '/login'}
                            >
                                {isLogin
                                    ? 'Need an account? Register'
                                    : 'Already registered? Login'}
                            </Link>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AuthPreparationSection;
