import { useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import styles from '../components/AuthPreparationSection.module.css';

function ForgotPasswordPage() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'recovery', key);
    const { requestPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        const cleanEmail = email.trim();

        if (!cleanEmail) {
            setErrorMessage(t('emailRequired'));
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            await requestPasswordReset(cleanEmail);
            setSuccessMessage(t('recoverySent'));
        } catch (error) {
            const message = error?.message || '';
            setErrorMessage(
                message === 'Failed to fetch'
                    ? t('connectionProblem')
                    : message || t('requestError'),
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
                            <p className={styles.eyebrow}>{t('accountRecovery')}</p>
                            <h2 id="password-recovery-title">{t('resetTitle')}</h2>
                            <p>{t('resetIntro')}</p>
                        </div>

                        <div className={`${styles.authGrid} ${styles.authGridSingle}`}>
                            <article className={styles.authCard}>
                                <div className={styles.cardHeading}>
                                    <span>01</span>
                                    <div>
                                        <p>{t('passwordRecovery')}</p>
                                        <h3>{t('requestLink')}</h3>
                                    </div>
                                </div>

                                <form className={styles.authForm} onSubmit={handleSubmit}>
                                    <label>
                                        <span>{t('email')}</span>
                                        <input
                                            type="email"
                                            name="email"
                                            autoComplete="username"
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
                                        {submitting ? t('sending') : t('sendRecoveryLink')}
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

                                <Link className={styles.switchLink} to="/login">
                                    {t('backLogin')}
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
