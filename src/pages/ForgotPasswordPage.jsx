import { useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../hooks/useAuth';
import styles from '../components/AuthPreparationSection.module.css';

function ForgotPasswordPage() {
    const { requestPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        const cleanEmail = email.trim();

        if (!cleanEmail) {
            setErrorMessage('Email is required.');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            await requestPasswordReset(cleanEmail);
            setSuccessMessage(
                'If this email belongs to an account, a password recovery link will be sent.',
            );
        } catch (error) {
            const message = error?.message || '';
            setErrorMessage(
                message === 'Failed to fetch'
                    ? 'Connection problem. Please try again.'
                    : message || 'Unable to request a password reset right now.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="route-page">
            <section className={styles.authSection} aria-labelledby="password-recovery-title">
                <div className="site-container">
                    <div className={styles.authShell}>
                        <div className={styles.authIntro}>
                            <p className={styles.eyebrow}>Account recovery</p>
                            <h2 id="password-recovery-title">Reset your password.</h2>
                            <p>
                                Enter the email used for your Cane Corso Heritage account.
                                We will send you a secure link to reset your password.
                            </p>
                        </div>

                        <div className={`${styles.authGrid} ${styles.authGridSingle}`}>
                            <article className={styles.authCard}>
                                <div className={styles.cardHeading}>
                                    <span>01</span>
                                    <div>
                                        <p>Password recovery</p>
                                        <h3>Request link</h3>
                                    </div>
                                </div>

                                <form className={styles.authForm} onSubmit={handleSubmit}>
                                    <label>
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(event) => {
                                                setEmail(event.target.value);
                                                setErrorMessage('');
                                                setSuccessMessage('');
                                            }}
                                            disabled={submitting}
                                        />
                                    </label>

                                    <button type="submit" disabled={submitting}>
                                        {submitting ? 'Sending...' : 'Send recovery link'}
                                    </button>
                                </form>

                                {errorMessage && (
                                    <p className={`${styles.formMessage} ${styles.formError}`} role="alert">
                                        {errorMessage}
                                    </p>
                                )}

                                {successMessage && (
                                    <p className={`${styles.formMessage} ${styles.formSuccess}`} aria-live="polite">
                                        {successMessage}
                                    </p>
                                )}

                                <Link className={styles.switchLink} to="/login">
                                    Back to login
                                </Link>
                            </article>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default ForgotPasswordPage;
