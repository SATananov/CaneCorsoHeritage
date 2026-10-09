import styles from '../../pages/AdminPage.module.css';

function AdminRatingsSection({
    storyRatings,
    fileRatings,
    memberNameById,
    t,
}) {
    return (
        <section aria-labelledby="admin-ratings-title">
            <h2 id="admin-ratings-title" className={styles.sectionTitle}>
                {t('ratings')}
            </h2>

            <div className={styles.ratingColumns}>
                <article className={styles.panel}>
                    <h3>{t('storyRatings')}</h3>

                    {storyRatings.length === 0 ? (
                        <p>{t('noStoryRatings')}</p>
                    ) : (
                        storyRatings.map((rating) => (
                            <p key={`${rating.story_id}-${rating.user_id}`}>
                                {memberNameById.get(rating.user_id) ?? t('member')} · {rating.rating}/5
                            </p>
                        ))
                    )}
                </article>

                <article className={styles.panel}>
                    <h3>{t('fileRatings')}</h3>

                    {fileRatings.length === 0 ? (
                        <p>{t('noFileRatings')}</p>
                    ) : (
                        fileRatings.map((rating) => (
                            <p key={`${rating.file_id}-${rating.user_id}`}>
                                {memberNameById.get(rating.user_id) ?? t('member')} · {rating.rating}/5
                            </p>
                        ))
                    )}
                </article>
            </div>
        </section>
    );
}

export default AdminRatingsSection;