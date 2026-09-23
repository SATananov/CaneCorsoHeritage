import styles from './LoadingSpinner.module.css';

function LoadingSpinner({ label = 'Loading...' }) {
    return (
        <article className={`story-preview-card ${styles.loadingCard}`} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true"></span>
            <p>{label}</p>
        </article>
    );
}

export default LoadingSpinner;
