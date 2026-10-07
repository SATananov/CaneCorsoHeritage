import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from './AuthPreparationSection.module.css';

function AuthPreparationSection({ mode = 'login' }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'auth', key);
    const location = useLocation();
    const { login, register } = useAuth();

    const isLogin = mode === 'login';
    const guardedFrom = location.state?.from;

    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
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
        const username = formData.username.trim().toLowerCase();
        const email = formData.email.trim();
        const password = formData.password;

        if (!email || !password) {
            setErrorMessage(t('emailPasswordRequired'));
            return;
        }

        if (!isLogin && displayName.length < 2) {
            setErrorMessage(t('nameMin'));
            return;
        }

        if (
            !isLogin
            && !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)
        ) {
            setErrorMessage(
                t('usernameInvalid'),
            );
            return;
        }

        if (password.length < 6) {
            setErrorMessage(t('passwordMin'));
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            if (isLogin) {
                const data = await login(email, password);
                const userId = data?.user?.id;

                if (!userId) {
                    throw new Error(t('unresolvedAccount'));
                }

                // RequireGuest owns navigation once auth state is updated.
                return;
            }

            const data = await register(
                displayName,
                username,
                email,
                password,
            );

            if (data.session?.user?.id) {
                return;
            }

            setSuccessMessage(
                t('confirmEmail'),
            );
            setFormData((current) => ({
                ...current,
                password: '',
            }));
        } catch (error) {
            const message = error?.message || '';

            if (message === 'Failed to fetch') {
                setErrorMessage(t('connectionProblem'));
            } else if (message === 'Invalid login credentials') {
                setErrorMessage(t('badCredentials'));
            } else if (message === 'Email not confirmed') {
                setErrorMessage(t('emailNotConfirmed'));
            } else if (
                message === 'Username already in use.'
                || message.toLowerCase().includes('username')
            ) {
                setErrorMessage(t('usernameUsed'));
            } else {
                setErrorMessage(t('unableContinue'));
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
                        <p className={styles.eyebrow}>{t('memberAccess')}</p>
                        <h2 id="account-access-title">
                            {isLogin ? t('welcomeBack') : t('joinTitle')}
                        </h2>
                        <p>
                            {isLogin
                                ? t('loginIntro')
                                : t('registerIntro')}
                        </p>

                        {typeof guardedFrom?.pathname === 'string' && isLogin && (
                            <p className={styles.routeNotice}>
                                {t('continueTo')} <strong>{guardedFrom.pathname}</strong>.
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
                                    <p>{isLogin ? t('returningMember') : t('newMember')}</p>
                                    <h3>{isLogin ? t('login') : t('register')}</h3>
                                </div>
                            </div>

                            <form className={styles.authForm} onSubmit={handleSubmit}>
                                {!isLogin && (
                                    <>
                                        <label>
                                            <span>{t('name')}</span>
                                            <input
                                                type="text"
                                                name="displayName"
                                                autoComplete="name"
                                                placeholder={t('yourName')}
                                                value={formData.displayName}
                                                onChange={handleChange}
                                                disabled={submitting}
                                            />
                                        </label>

                                        <label>
                                            <span>{t('publicUsername')}</span>
                                            <input
                                                type="text"
                                                name="username"
                                                autoComplete="nickname"
                                                placeholder="stefan.tananov"
                                                value={formData.username}
                                                onChange={handleChange}
                                                disabled={submitting}
                                            />
                                        </label>
                                    </>
                                )}

                                <label>
                                    <span>{t('email')}</span>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="username"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                </label>

                                <label>
                                    <span>{t('password')}</span>
                                    <input
                                        type="password"
                                        name="password"
                                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        placeholder={isLogin ? t('yourPassword') : t('createPassword')}
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                </label>

                                <button type="submit" disabled={submitting}>
                                    {submitting
                                        ? t('submitting')
                                        : isLogin
                                            ? t('loginAction')
                                            : t('registerAction')}
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

                            {isLogin && (
                                <Link
                                    className={styles.switchLink}
                                    to="/forgot-password"
                                >
                                    {t('forgotPassword')}
                                </Link>
                            )}

                            <Link
                                className={styles.switchLink}
                                to={isLogin ? '/register' : '/login'}
                            >
                                {isLogin
                                    ? `${t('noAccount')} ${t('register')}`
                                    : `${t('haveAccount')} ${t('login')}`}
                            </Link>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AuthPreparationSection;
