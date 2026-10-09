import styles from '../../pages/AdminPage.module.css';

function AdminPendingSection({
    pendingStories,
    pendingFiles,
    pendingStoriesCount,
    pendingFilesCount,
    memberNameById,
    dateLabel,
    renderStoryActions,
    renderFileActions,
    t,
}) {
    return (
        <section aria-labelledby="admin-pending-title">
            <h2 id="admin-pending-title" className={styles.sectionTitle}>
                {t('pendingApprovals')}
            </h2>

            <p className={styles.sectionIntro}>
                {t('pendingIntro')}
            </p>

            <h3 className={styles.subsectionTitle}>
                {t('stories')} · {pendingStoriesCount}
            </h3>

            {pendingStories.length === 0 ? (
                <p className={styles.emptyQueue}>{t('noPendingStories')}</p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('title')}</th>
                                <th>{t('author')}</th>
                                <th>{t('created')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {pendingStories.map((story) => (
                                <tr key={story.id}>
                                    <td>{story.title || t('untitled')}</td>
                                    <td>
                                        {memberNameById.get(story.author_id) ?? (
                                            <span className={styles.unlinkedMember}>
                                                {t('noLinkedProfile')}
                                            </span>
                                        )}
                                    </td>
                                    <td>{dateLabel(story.created_at)}</td>
                                    <td>{renderStoryActions(story)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <h3 className={styles.subsectionTitle}>
                {t('files')} · {pendingFilesCount}
            </h3>

            {pendingFiles.length === 0 ? (
                <p className={styles.emptyQueue}>{t('noPendingFiles')}</p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('file')}</th>
                                <th>{t('owner')}</th>
                                <th>{t('type')}</th>
                                <th>{t('created')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {pendingFiles.map((file) => (
                                <tr key={file.id}>
                                    <td>{file.file_name}</td>
                                    <td>
                                        {memberNameById.get(file.user_id) ?? (
                                            <span className={styles.unlinkedMember}>
                                                {t('noLinkedProfile')}
                                            </span>
                                        )}
                                    </td>
                                    <td>{file.mime_type || '—'}</td>
                                    <td>{dateLabel(file.created_at)}</td>
                                    <td>{renderFileActions(file)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default AdminPendingSection;