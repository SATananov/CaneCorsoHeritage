import styles from '../../pages/AdminPage.module.css';

function AdminStoriesSection({
    stories,
    memberNameById,
    statusLabel,
    dateLabel,
    renderStoryActions,
    t,
}) {
    return (
        <section aria-labelledby="admin-stories-title">
            <h2 id="admin-stories-title" className={styles.sectionTitle}>
                {t('stories')}
            </h2>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('title')}</th>
                            <th>{t('author')}</th>
                            <th>{t('visibility')}</th>
                            <th>{t('moderation')}</th>
                            <th>{t('created')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {stories.map((story) => (
                            <tr key={story.id}>
                                <td>
                                    <a
                                        className={styles.storyOpenLink}
                                        href={`/stories/${story.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {story.title || t('untitled')}
                                    </a>
                                </td>

                                <td>
                                    {memberNameById.get(story.author_id) ?? (
                                        <span className={styles.unlinkedMember}>
                                            {t('noLinkedProfile')}
                                        </span>
                                    )}
                                </td>

                                <td>{statusLabel(story.visibility)}</td>

                                <td>
                                    <span
                                        className={`${styles.moderationStatus} ${styles[`status_${story.moderation_status || 'approved'}`]}`}
                                    >
                                        {statusLabel(story.moderation_status || 'approved')}
                                    </span>
                                </td>

                                <td>{dateLabel(story.created_at)}</td>
                                <td>{renderStoryActions(story)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default AdminStoriesSection;