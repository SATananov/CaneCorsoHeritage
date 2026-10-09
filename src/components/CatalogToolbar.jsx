import styles from './CatalogToolbar.module.css';

function CatalogToolbar({
    searchLabel,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    sortLabel,
    sortValue,
    onSortChange,
    sortOptions,
}) {
    return (
        <div className={styles.controls}>
            <label className={styles.field}>
                <span>{searchLabel}</span>
                <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                />
            </label>

            <label className={styles.field}>
                <span>{sortLabel}</span>
                <select
                    value={sortValue}
                    onChange={(event) => onSortChange(event.target.value)}
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

export default CatalogToolbar;