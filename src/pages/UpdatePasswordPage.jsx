import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '../lib/supabaseClient';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from '../components/AuthPreparationSection.module.css';

function UpdatePasswordPage() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'recovery', key);
    const navigate = useNavigate();
    const { updatePassword, logout } = useAuth();
    const [recoveryReady, setRecoveryReady] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function checkRecoverySession() {
            const { data, error } = await supabase.auth.getSession();

            if (!active) {
                return;
            }

            if (error) {
                setErrorMessage(error.message || t('verifyError'));
                setRecoveryReady(false);
            } else {
                setRecoveryReady(Boolean(data?.session));
            }

            setCheckingSession(false);
        }

        checkRecoverySession();

        return () => {
            active = false;
        };
    }, []);

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
            await logout();
            navigate('/login', {
                replace: true,
                state: { passwordUpdated: true },
            });
        } catch (error) {
            const message = error?.message || '';
            setErrorMessage(
                message === 'Failed to fetch'
                    ? t('connectionProblem')
                    : message || t('updateError'),
            );
        } finally {
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
