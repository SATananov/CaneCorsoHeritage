import styles from '../../pages/AdminPage.module.css';

function AdminOverviewSection({ counts, t }) {
    return (
        <section aria-labelledby="admin-overview-title">
            <h2 id="admin-overview-title" className={styles.sectionTitle}>
                {t('overview')}
            </h2>

            <div className={styles.statsGrid}>
                <article className={styles.statCard}>
                    <span>{t('members')}</span>
                    <strong>{counts.members}</strong>
                </article>

                <article className={styles.statCard}>
                    <span>{t('stories')}</span>
                    <strong>{counts.stories}</strong>
                </article>

                <article className={styles.statCard}>
                    <span>{t('files')}</span>
                    <strong>{counts.files}</strong>
                </article>

                <article className={styles.statCard}>
                    <span>{t('pending')}</span>
                    <strong>{counts.pending}</strong>
                </article>
            </div>

            <p className={styles.note}>
                {t('overviewNote')}
            </p>
        </section>
    );
}

export default AdminOverviewSection;