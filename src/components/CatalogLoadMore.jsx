import styles from './CatalogLoadMore.module.css';

function CatalogLoadMore({
    label,
    statusLabel,
    visibleCount,
    totalCount,
    onLoadMore,
}) {
    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.button}
                onClick={onLoadMore}
            >
                {label}
            </button>

            <span className={styles.status} aria-live="polite">
                {statusLabel} {Math.min(visibleCount, totalCount)} / {totalCount}
            </span>
        </div>
    );
}

export default CatalogLoadMore;