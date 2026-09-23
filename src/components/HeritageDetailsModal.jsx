import styles from './HeritageDetailsModal.module.css';

function HeritageDetailsModal({ heritage, onClose }) {
    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.dialog}
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

                <div className={styles.imageFrame}>
                    <img src={heritage.image} alt="" />
                </div>

                <div className={styles.content}>
                    <p className={styles.eyebrow}>{heritage.eyebrow}</p>
                    <h2 id="heritage-details-title">{heritage.title}</h2>
                    <p className={styles.description}>{heritage.description}</p>

                    <div className={styles.divider} />

                    <p className={styles.body}>{heritage.content ?? heritage.details}</p>

                    <div className={styles.footer}>
                        <span>Unico Suo Genere · Cane Corso Heritage</span>
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
