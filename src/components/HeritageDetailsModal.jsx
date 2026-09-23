import styles from './HeritageDetailsModal.module.css';

const categoryLabels = {
    stories: 'True Story',
    'heritage-history': 'Heritage & History',
    understanding: 'Understanding Cane Corso',
    'living-care': 'Living & Care',
    research: 'USG Research',
};

function HeritageDetailsModal({ heritage, onClose }) {
    const isLibraryArticle = Boolean(heritage.slug);
    const image = heritage.cover_image ?? heritage.image;
    const sections = heritage.content?.sections;
    const hasStructuredContent = Array.isArray(sections) && sections.length > 0;
    const eyebrow = heritage.content_type === 'heritage-story'
        ? 'Dr. Flavio Bruno · Heritage Story'
        : categoryLabels[heritage.category] ?? heritage.eyebrow ?? 'Cane Corso Heritage';

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <section
                className={`${styles.dialog} ${!image ? styles.textOnlyDialog : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="heritage-details-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    className={styles.closeButton}
                    type="button"
                    aria-label="Close heritage details"
                    onClick={onClose}
                >
                    ×
                </button>

                {image && (
                    <div className={styles.imageFrame}>
                        <img src={image} alt="" />
                    </div>
                )}

                <div className={styles.content}>
                    <p className={styles.eyebrow}>{eyebrow}</p>
                    <h2 id="heritage-details-title">{heritage.title}</h2>

                    {(heritage.subtitle || heritage.description) && (
                        <p className={styles.description}>
                            {heritage.subtitle ?? heritage.description}
                        </p>
                    )}

                    {isLibraryArticle && heritage.summary && (
                        <p className={styles.summary}>{heritage.summary}</p>
                    )}

                    <div className={styles.divider} />

                    {hasStructuredContent ? (
                        <div className={styles.articleBody}>
                            {sections.map((section) => (
                                <section key={section.heading} className={styles.articleSection}>
                                    <h3>{section.heading}</h3>
                                    {section.paragraphs.map((paragraph, index) => (
                                        <p key={`${section.heading}-${index}`}>{paragraph}</p>
                                    ))}
                                </section>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.body}>{heritage.content ?? heritage.details}</p>
                    )}

                    {isLibraryArticle && (
                        <div className={styles.attribution}>
                            {heritage.story_by ? (
                                <>
                                    <strong>Story by {heritage.story_by}</strong>
                                    {heritage.adaptation_by && (
                                        <span>English adaptation by {heritage.adaptation_by}</span>
                                    )}
                                </>
                            ) : (
                                <strong>By {heritage.author}</strong>
                            )}

                            {heritage.source_credit && <span>{heritage.source_credit}</span>}
                        </div>
                    )}

                    <div className={styles.footer}>
                        <span>USG · Unico Suo Genere™ · Cane Corso Heritage</span>
                        <button type="button" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default HeritageDetailsModal;
