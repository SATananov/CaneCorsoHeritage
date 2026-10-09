import styles from './CatalogResultSummary.module.css';

function CatalogResultSummary({ label, count }) {
    return (
        <p className={styles.summary} aria-live="polite">
            {label}: {count}
        </p>
    );
}

export default CatalogResultSummary;