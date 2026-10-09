import styles from '../../pages/AdminPage.module.css';

function AdminMembersSection({
    profiles,
    roleByUser,
    statusLabel,
    dateLabel,
    renderMemberActions,
    t,
}) {
    return (
        <section aria-labelledby="admin-members-title">
            <h2 id="admin-members-title" className={styles.sectionTitle}>
                {t('members')}
            </h2>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('member')}</th>
                            <th>{t('username')}</th>
                            <th>{t('role')}</th>
                            <th>{t('account')}</th>
                            <th>{t('joined')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {profiles.map((profile) => {
                            const roleInfo = roleByUser.get(profile.id);
                            const role = roleInfo?.role ?? 'unknown';
                            const accountStatus = roleInfo?.account_status ?? 'unknown';

                            return (
                                <tr key={profile.id}>
                                    <td>{profile.display_name || '—'}</td>
                                    <td>{profile.username || '—'}</td>

                                    <td>
                                        <span className={role === 'admin' ? styles.adminRole : styles.userRole}>
                                            {statusLabel(role)}
                                        </span>
                                    </td>

                                    <td>
                                        <span
                                            className={
                                                accountStatus === 'active'
                                                    ? styles.activeStatus
                                                    : accountStatus === 'inactive'
                                                        ? styles.inactiveStatus
                                                        : styles.userRole
                                            }
                                        >
                                            {statusLabel(accountStatus)}
                                        </span>
                                    </td>

                                    <td>{dateLabel(profile.created_at)}</td>
                                    <td>{renderMemberActions(profile, roleInfo)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className={styles.note}>
                {t('deactivationNote')}
            </p>
        </section>
    );
}

export default AdminMembersSection;