import styles from './Toast.module.css';

const ICONS = {
    success: '✓',
    error: '!',
    info: 'i',
};

function ToastItem({ toast, closeLabel, onDismiss }) {
    const isError = toast.type === 'error';
    const isLoading = toast.type === 'loading';

    return (
        <article
            className={`${styles.toast} ${styles[toast.type]}`}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            aria-atomic="true"
            style={toast.duration ? { '--toast-duration': `${toast.duration}ms` } : undefined}
        >
            <div className={styles.icon} aria-hidden="true">
                {isLoading ? <span className={styles.spinner} /> : ICONS[toast.type]}
            </div>

            <div className={styles.copy}>
                <strong>{toast.title}</strong>
                {toast.message && <p>{toast.message}</p>}
            </div>

            <button
                className={styles.close}
                type="button"
                aria-label={closeLabel}
                onClick={() => onDismiss(toast.id)}
            >
                ×
            </button>

            {isLoading ? (
                <span className={styles.loadingRail} aria-hidden="true" />
            ) : toast.duration ? (
                <span className={styles.progress} aria-hidden="true" />
            ) : null}
        </article>
    );
}

export default ToastItem;
