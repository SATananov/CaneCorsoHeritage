import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from '../components/AuthPreparationSection.module.css';

function UpdatePasswordPage() {
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'recovery', key), [language]);
    const navigate = useNavigate();
    const { passwordRecovery, updatePassword, logout } = useAuth();
    const recoveryReady = passwordRecovery === true;
    const checkingSession = passwordRecovery === null;
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [passwordUpdated, setPasswordUpdated] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (password.length < 10) {
            setErrorMessage(t('useAtLeastTen'));
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage(t('mismatch'));
            return;
        }

        setSubmitting(true);
        setErrorMessage('');

        try {
            await updatePassword(password);
            setPasswordUpdated(true);
        } catch (error) {
            const message = error?.message || '';
            setErrorMessage(
                message === 'Failed to fetch'
                    ? t('connectionProblem')
                    : t('updateError'),
            );
            setSubmitting(false);
            return;
        }

        try {
            await logout();
            setSubmitting(false);
            navigate('/login', {
                replace: true,
                state: { passwordUpdated: true },
            });
        } catch {
            // The password update already succeeded. Keep that success visible
            // instead of misreporting a sign-out failure as an update failure.
            setSubmitting(false);
        }
    }

    return (
        <main className="route-page">
            <section className={styles.authSection} aria-labelledby="update-password-title">
                <div className="site-container">
                    <div className={styles.authShell}>
                        <div className={styles.authIntro}>
                            <p className={styles.eyebrow}>{t('secureRecovery')}</p>
                            <h2 id="update-password-title">{t('updateTitle')}.</h2>
                            <p>{t('updatePageIntro')}</p>
                        </div>

                        <div className={`${styles.authGrid} ${styles.authGridSingle}`}>
                            <article className={styles.authCard}>
                                <div className={styles.cardHeading}>
                                    <span>02</span>
                                    <div>
                                        <p>{t('passwordRecovery')}</p>
                                        <h3>{t('newPassword')}</h3>
                                    </div>
                                </div>

                                {checkingSession ? (
                                    <p className={styles.statusNote} aria-live="polite">
                                        {t('verifying')}
                                    </p>
                                ) : passwordUpdated ? (
                                    <p className={`${styles.formMessage} ${styles.formSuccess}`} aria-live="polite">
                                        {t('updated')}
                                    </p>
                                ) : recoveryReady ? (
                                    <form className={styles.authForm} onSubmit={handleSubmit}>
                                        <label>
                                            <span>{t('newPassword')}</span>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                autoComplete="new-password"
                                                value={password}
                                                onChange={(event) => {
                                                    setPassword(event.target.value);
                                                    setErrorMessage('');
                                                }}
                                                disabled={submitting}
                                            />
                                        </label>

                                        <label>
                                            <span>{t('confirmNewPassword')}</span>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={(event) => {
                                                    setConfirmPassword(event.target.value);
                                                    setErrorMessage('');
                                                }}
                                                disabled={submitting}
                                            />
                                        </label>

                                        <button type="submit" disabled={submitting}>
                                            {submitting ? t('updating') : t('setNewPassword')}
                                        </button>
                                    </form>
                                ) : (
                                    <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                        {t('recoveryExpired')}
                                    </p>
                                )}

                                {errorMessage && (
                                    <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                        {errorMessage}
                                    </p>
                                )}

                                {!recoveryReady && !checkingSession && (
                                    <Link className={styles.switchLink} to="/forgot-password">
                                        {t('requestNewLink')}
                                    </Link>
                                )}
                            </article>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default UpdatePasswordPage;
