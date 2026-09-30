import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '../lib/supabaseClient';
import useAuth from '../hooks/useAuth';
import styles from '../components/AuthPreparationSection.module.css';

function UpdatePasswordPage() {
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
                setErrorMessage(error.message || 'Unable to verify the recovery session.');
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
            setErrorMessage('Use at least 10 characters for the new password.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('The passwords do not match.');
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
                    ? 'Connection problem. Please try again.'
                    : message || 'Unable to update the password right now.',
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
                            <p className={styles.eyebrow}>Secure account recovery</p>
                            <h2 id="update-password-title">Choose a new password.</h2>
                            <p>
                                Open this page from your password recovery email,
                                then choose a new password for the account.
                            </p>
                        </div>

                        <div className={`${styles.authGrid} ${styles.authGridSingle}`}>
                            <article className={styles.authCard}>
                                <div className={styles.cardHeading}>
                                    <span>02</span>
                                    <div>
                                        <p>Password recovery</p>
                                        <h3>New password</h3>
                                    </div>
                                </div>

                                {checkingSession ? (
                                    <p className={styles.statusNote} aria-live="polite">
                                        Verifying recovery session...
                                    </p>
                                ) : recoveryReady ? (
                                    <form className={styles.authForm} onSubmit={handleSubmit}>
                                        <label>
                                            <span>New password</span>
                                            <input
                                                type="password"
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
                                            <span>Confirm new password</span>
                                            <input
                                                type="password"
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
                                            {submitting ? 'Updating...' : 'Set new password'}
                                        </button>
                                    </form>
                                ) : (
                                    <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                        This recovery link is missing, expired or no longer has a valid session.
                                        Request a new password recovery email and try again.
                                    </p>
                                )}

                                {errorMessage && (
                                    <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                        {errorMessage}
                                    </p>
                                )}

                                {!recoveryReady && !checkingSession && (
                                    <Link className={styles.switchLink} to="/forgot-password">
                                        Request a new recovery link
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
