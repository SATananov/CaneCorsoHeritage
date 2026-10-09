import styles from '../../pages/AdminPage.module.css';

function AdminFilesSection({
    files,
    memberNameById,
    statusLabel,
    formatBytes,
    renderFileActions,
    t,
}) {
    return (
        <section aria-labelledby="admin-files-title">
            <h2 id="admin-files-title" className={styles.sectionTitle}>
                {t('files')}
            </h2>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('file')}</th>
                            <th>{t('owner')}</th>
                            <th>{t('type')}</th>
                            <th>{t('size')}</th>
                            <th>{t('visibility')}</th>
                            <th>{t('moderation')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {files.map((file) => (
                            <tr key={file.id}>
                                <td>
                                    {file.url ? (
                                        <a
                                            className={styles.fileOpenLink}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {file.file_name}
                                        </a>
                                    ) : (
                                        file.file_name
                                    )}
                                </td>

                                <td>
                                    {memberNameById.get(file.user_id) ?? (
                                        <span className={styles.unlinkedMember}>
                                            {t('noLinkedProfile')}
                                        </span>
                                    )}
                                </td>

                                <td>{file.mime_type || '—'}</td>
                                <td>{formatBytes(file.file_size)}</td>
                                <td>{statusLabel(file.visibility)}</td>

                                <td>
                                    <span
                                        className={`${styles.moderationStatus} ${styles[`status_${file.moderation_status || 'approved'}`]}`}
                                    >
                                        {statusLabel(file.moderation_status || 'approved')}
                                    </span>
                                </td>

                                <td>{renderFileActions(file)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default AdminFilesSection;