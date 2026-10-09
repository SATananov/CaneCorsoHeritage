function CatalogEmptyState({ className, message }) {
    return (
        <div className={className} role="status" aria-live="polite">
            {message}
        </div>
    );
}

export default CatalogEmptyState;