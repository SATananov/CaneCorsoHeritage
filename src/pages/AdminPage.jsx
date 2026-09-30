import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import useAuth from '../hooks/useAuth';
import {
    adminDeleteFile,
    adminDeleteStory,
    fetchAdminDashboard,
    fetchAdminMemberDetails,
    moderateFile,
    moderateStory,
    setMemberAccountStatus,
} from '../services/adminService';
import styles from './AdminPage.module.css';

const sections = [
    ['overview', 'Overview'],
    ['pending', 'Pending approvals'],
    ['members', 'Members'],
    ['stories', 'Stories'],
    ['files', 'Files'],
    ['ratings', 'Ratings'],
];

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatBytes(bytes) {
    if (!Number.isFinite(Number(bytes))) {
        return '—';
    }

    const value = Number(bytes);

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(value) {
    return value ? value.replaceAll('_', ' ') : '—';
}

function AdminPage() {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyKey, setBusyKey] = useState('');
    const [memberDetails, setMemberDetails] = useState(null);
    const [memberDetailsLoading, setMemberDetailsLoading] = useState(false);

    async function refreshDashboard(options = {}) {
        const nextData = await fetchAdminDashboard(options);
        setData(nextData);
    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadDashboard() {
            setLoading(true);
            setError('');

            try {
                await refreshDashboard({ signal: controller.signal });
            } catch (loadError) {
                if (controller.signal.aborted || loadError.name === 'AbortError') {
                    return;
                }

                setError(loadError.message || 'Unable to load the administration panel.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => controller.abort();
    }, []);

    const roleByUser = useMemo(() => {
        const result = new Map();

        for (const item of data?.roles ?? []) {
            result.set(item.user_id, item);
        }

        return result;
    }, [data]);

    const memberNameById = useMemo(() => {
        const result = new Map();

        for (const profile of data?.profiles ?? []) {
            result.set(
                profile.id,
                profile.display_name || profile.username || profile.id,
            );
        }

        return result;
    }, [data]);

    const pendingStories = useMemo(
        () => (data?.stories ?? []).filter(
            (story) => story.visibility === 'community' && story.moderation_status === 'pending',
        ),
        [data],
    );

    const pendingFiles = useMemo(
        () => (data?.files ?? []).filter(
            (file) => file.visibility === 'community' && file.moderation_status === 'pending',
        ),
        [data],
    );

    async function runAction(key, successMessage, action) {
        try {
            setBusyKey(key);
            setError('');
            setMessage('');
            await action();
            await refreshDashboard();
            setMessage(successMessage);
        } catch (actionError) {
            setError(actionError.message || 'The administration action could not be completed.');
        } finally {
            setBusyKey('');
        }
    }

    function confirmAndRun(prompt, key, successMessage, action) {
        if (!window.confirm(prompt)) {
            return;
        }

        runAction(key, successMessage, action);
    }

    async function openMemberDetails(profile) {
        try {
            setMemberDetailsLoading(true);
            setError('');
            const details = await fetchAdminMemberDetails(profile.id);

            setMemberDetails({
                ...details,
                display_name: details?.display_name || profile.display_name || null,
                username: details?.username || profile.username || null,
                profile_created_at: details?.profile_created_at || profile.created_at || null,
                stories_count: (data?.stories ?? []).filter((story) => story.author_id === profile.id).length,
                files_count: (data?.files ?? []).filter((file) => file.user_id === profile.id).length,
            });
        } catch (detailsError) {
            setError(detailsError.message || 'Unable to load member details.');
        } finally {
            setMemberDetailsLoading(false);
        }
    }

    function closeMemberDetails() {
        setMemberDetails(null);
    }

    function storyActions(story) {
        const keyPrefix = `story-${story.id}`;

        return (
            <div className={styles.rowActions}>
                {story.visibility === 'community' && story.moderation_status === 'pending' && (
                    <>
                        <button
                            className={styles.approveButton}
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() => runAction(
                                `${keyPrefix}-approve`,
                                'Story approved.',
                                () => moderateStory(story.id, 'approved'),
                            )}
                        >
                            Approve
                        </button>
                        <button
                            className={styles.rejectButton}
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() => confirmAndRun(
                                `Reject "${story.title || 'Untitled'}"?`,
                                `${keyPrefix}-reject`,
                                'Story rejected.',
                                () => moderateStory(story.id, 'rejected'),
                            )}
                        >
                            Reject
                        </button>
                    </>
                )}

                {story.visibility === 'community' && story.moderation_status === 'approved' && (
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => confirmAndRun(
                            `Hide "${story.title || 'Untitled'}" from the Community?`,
                            `${keyPrefix}-hide`,
                            'Story hidden.',
                            () => moderateStory(story.id, 'hidden'),
                        )}
                    >
                        Hide
                    </button>
                )}

                {story.visibility === 'community' && ['hidden', 'rejected'].includes(story.moderation_status) && (
                    <button
                        className={styles.approveButton}
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => runAction(
                            `${keyPrefix}-restore`,
                            'Story restored and approved.',
                            () => moderateStory(story.id, 'approved'),
                        )}
                    >
                        Restore
                    </button>
                )}

                <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() => confirmAndRun(
                        `Permanently delete "${story.title || 'Untitled'}" and its attached files?`,
                        `${keyPrefix}-delete`,
                        'Story deleted.',
                        () => adminDeleteStory(story.id),
                    )}
                >
                    Delete
                </button>
            </div>
        );
    }

    function fileActions(file) {
        const keyPrefix = `file-${file.id}`;

        return (
            <div className={styles.rowActions}>
                {file.visibility === 'community' && file.moderation_status === 'pending' && (
                    <>
                        <button
                            className={styles.approveButton}
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() => runAction(
                                `${keyPrefix}-approve`,
                                'File approved.',
                                () => moderateFile(file.id, 'approved'),
                            )}
                        >
                            Approve
                        </button>
                        <button
                            className={styles.rejectButton}
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() => confirmAndRun(
                                `Reject "${file.file_name}"?`,
                                `${keyPrefix}-reject`,
                                'File rejected.',
                                () => moderateFile(file.id, 'rejected'),
                            )}
                        >
                            Reject
                        </button>
                    </>
                )}

                {file.visibility === 'community' && file.moderation_status === 'approved' && (
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => confirmAndRun(
                            `Hide "${file.file_name}" from the Community?`,
                            `${keyPrefix}-hide`,
                            'File hidden.',
                            () => moderateFile(file.id, 'hidden'),
                        )}
                    >
                        Hide
                    </button>
                )}

                {file.visibility === 'community' && ['hidden', 'rejected'].includes(file.moderation_status) && (
                    <button
                        className={styles.approveButton}
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => runAction(
                            `${keyPrefix}-restore`,
                            'File restored and approved.',
                            () => moderateFile(file.id, 'approved'),
                        )}
                    >
                        Restore
                    </button>
                )}

                <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() => confirmAndRun(
                        `Permanently delete "${file.file_name}"?`,
                        `${keyPrefix}-delete`,
                        'File deleted.',
                        () => adminDeleteFile(file),
                    )}
                >
                    Delete
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <main className={styles.page}>
                <div className="site-container">
                    <LoadingSpinner label="Loading administration panel..." />
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={`site-container ${styles.shell}`}>
                <aside className={styles.sidebar} aria-label="Administration navigation">
                    <div className={styles.sidebarHeading}>
                        <span>USG</span>
                        <strong>Administration</strong>
                    </div>

                    <nav className={styles.adminNav}>
                        {sections.map(([id, label]) => (
                            <button
                                key={id}
                                className={activeSection === id ? styles.activeNavButton : styles.navButton}
                                type="button"
                                onClick={() => setActiveSection(id)}
                            >
                                {label}
                                {id === 'pending' && data?.counts.pending > 0 && (
                                    <span className={styles.navCount}>{data.counts.pending}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <NavLink className={styles.backLink} to="/">
                        ← Back to website
                    </NavLink>
                </aside>

                <section className={styles.content}>
                    <header className={styles.header}>
                        <div>
                            <p className={styles.eyebrow}>Cane Corso Heritage</p>
                            <h1>Administration</h1>
                        </div>
                        <span className={styles.moderationBadge}>Moderation v2</span>
                    </header>

                    {message && (
                        <div className={styles.success} role="status">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    )}

                    {data && activeSection === 'overview' && (
                        <section aria-labelledby="admin-overview-title">
                            <h2 id="admin-overview-title" className={styles.sectionTitle}>Overview</h2>
                            <div className={styles.statsGrid}>
                                <article className={styles.statCard}><span>Members</span><strong>{data.counts.members}</strong></article>
                                <article className={styles.statCard}><span>Stories</span><strong>{data.counts.stories}</strong></article>
                                <article className={styles.statCard}><span>Files</span><strong>{data.counts.files}</strong></article>
                                <article className={styles.statCard}><span>Pending</span><strong>{data.counts.pending}</strong></article>
                            </div>
                            <p className={styles.note}>
                                Community Stories and files now require administrator approval. Private content remains private and does not enter the moderation queue.
                            </p>
                        </section>
                    )}

                    {data && activeSection === 'pending' && (
                        <section aria-labelledby="admin-pending-title">
                            <h2 id="admin-pending-title" className={styles.sectionTitle}>Pending approvals</h2>
                            <p className={styles.sectionIntro}>
                                Review new Community material before it becomes public.
                            </p>

                            <h3 className={styles.subsectionTitle}>Stories · {data.counts.pendingStories}</h3>
                            {pendingStories.length === 0 ? (
                                <p className={styles.emptyQueue}>No pending Stories.</p>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>Title</th><th>Author</th><th>Created</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {pendingStories.map((story) => (
                                                <tr key={story.id}>
                                                    <td>{story.title || 'Untitled'}</td>
                                                    <td>{memberNameById.get(story.author_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                    <td>{formatDate(story.created_at)}</td>
                                                    <td>{storyActions(story)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <h3 className={styles.subsectionTitle}>Files · {data.counts.pendingFiles}</h3>
                            {pendingFiles.length === 0 ? (
                                <p className={styles.emptyQueue}>No pending files.</p>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>File</th><th>Owner</th><th>Type</th><th>Created</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {pendingFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td>{file.file_name}</td>
                                                    <td>{memberNameById.get(file.user_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                    <td>{file.mime_type || '—'}</td>
                                                    <td>{formatDate(file.created_at)}</td>
                                                    <td>{fileActions(file)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {data && activeSection === 'members' && (
                        <section aria-labelledby="admin-members-title">
                            <h2 id="admin-members-title" className={styles.sectionTitle}>Members</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>Member</th><th>Username</th><th>Role</th><th>Account</th><th>Joined</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {data.profiles.map((profile) => {
                                            const roleInfo = roleByUser.get(profile.id);
                                            const accountStatus = roleInfo?.account_status ?? 'active';
                                            const isCurrentAdmin = profile.id === user?.id;

                                            return (
                                                <tr key={profile.id}>
                                                    <td>{profile.display_name || '—'}</td>
                                                    <td>{profile.username || '—'}</td>
                                                    <td><span className={roleInfo?.role === 'admin' ? styles.adminRole : styles.userRole}>{roleInfo?.role ?? 'user'}</span></td>
                                                    <td><span className={accountStatus === 'active' ? styles.activeStatus : styles.inactiveStatus}>{accountStatus}</span></td>
                                                    <td>{formatDate(profile.created_at)}</td>
                                                    <td>
                                                        <div className={styles.rowActions}>
                                                            <button
                                                                className={styles.secondaryButton}
                                                                type="button"
                                                                disabled={memberDetailsLoading}
                                                                onClick={() => openMemberDetails(profile)}
                                                            >
                                                                Details
                                                            </button>
                                                            {isCurrentAdmin ? (
                                                                <span className={styles.currentAdmin}>Current admin</span>
                                                            ) : (
                                                                <button
                                                                    className={accountStatus === 'active' ? styles.rejectButton : styles.approveButton}
                                                                    type="button"
                                                                    disabled={Boolean(busyKey)}
                                                                    onClick={() => confirmAndRun(
                                                                        `${accountStatus === 'active' ? 'Deactivate' : 'Reactivate'} ${profile.display_name || profile.username || 'this member'}?`,
                                                                        `member-${profile.id}-${accountStatus}`,
                                                                        accountStatus === 'active' ? 'Member deactivated.' : 'Member reactivated.',
                                                                        () => setMemberAccountStatus(
                                                                            profile.id,
                                                                            accountStatus === 'active' ? 'inactive' : 'active',
                                                                        ),
                                                                    )}
                                                                >
                                                                    {accountStatus === 'active' ? 'Deactivate' : 'Reactivate'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className={styles.note}>
                                Deactivation blocks protected account features and write operations. Permanent account deletion is intentionally reserved for a separate server-side step.
                            </p>
                        </section>
                    )}

                    {data && activeSection === 'stories' && (
                        <section aria-labelledby="admin-stories-title">
                            <h2 id="admin-stories-title" className={styles.sectionTitle}>Stories</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>Title</th><th>Author</th><th>Visibility</th><th>Moderation</th><th>Created</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {data.stories.map((story) => (
                                            <tr key={story.id}>
                                                <td>{story.title || 'Untitled'}</td>
                                                <td>{memberNameById.get(story.author_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                <td>{statusLabel(story.visibility)}</td>
                                                <td><span className={`${styles.moderationStatus} ${styles[`status_${story.moderation_status || 'approved'}`]}`}>{statusLabel(story.moderation_status || 'approved')}</span></td>
                                                <td>{formatDate(story.created_at)}</td>
                                                <td>{storyActions(story)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {data && activeSection === 'files' && (
                        <section aria-labelledby="admin-files-title">
                            <h2 id="admin-files-title" className={styles.sectionTitle}>Files</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>File</th><th>Owner</th><th>Type</th><th>Size</th><th>Visibility</th><th>Moderation</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {data.files.map((file) => (
                                            <tr key={file.id}>
                                                <td>{file.file_name}</td>
                                                <td>{memberNameById.get(file.user_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                <td>{file.mime_type || '—'}</td>
                                                <td>{formatBytes(file.file_size)}</td>
                                                <td>{statusLabel(file.visibility)}</td>
                                                <td><span className={`${styles.moderationStatus} ${styles[`status_${file.moderation_status || 'approved'}`]}`}>{statusLabel(file.moderation_status || 'approved')}</span></td>
                                                <td>{fileActions(file)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {data && activeSection === 'ratings' && (
                        <section aria-labelledby="admin-ratings-title">
                            <h2 id="admin-ratings-title" className={styles.sectionTitle}>Ratings</h2>
                            <div className={styles.ratingColumns}>
                                <article className={styles.panel}>
                                    <h3>Story ratings</h3>
                                    {data.storyRatings.length === 0 ? <p>No Story ratings yet.</p> : data.storyRatings.map((rating) => (
                                        <p key={`${rating.story_id}-${rating.user_id}`}>{memberNameById.get(rating.user_id) ?? 'Member'} · {rating.rating}/5</p>
                                    ))}
                                </article>
                                <article className={styles.panel}>
                                    <h3>File ratings</h3>
                                    {data.fileRatings.length === 0 ? <p>No file ratings yet.</p> : data.fileRatings.map((rating) => (
                                        <p key={`${rating.file_id}-${rating.user_id}`}>{memberNameById.get(rating.user_id) ?? 'Member'} · {rating.rating}/5</p>
                                    ))}
                                </article>
                            </div>
                        </section>
                    )}
                </section>
            </div>

            {memberDetails && (
                <div
                    className={styles.modalBackdrop}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) {
                            closeMemberDetails();
                        }
                    }}
                >
                    <section
                        className={styles.memberModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-member-details-title"
                    >
                        <header className={styles.memberModalHeader}>
                            <div>
                                <p className={styles.eyebrow}>Member details</p>
                                <h2 id="admin-member-details-title">
                                    {memberDetails.display_name || memberDetails.username || 'Member'}
                                </h2>
                            </div>
                            <button
                                className={styles.closeButton}
                                type="button"
                                aria-label="Close member details"
                                onClick={closeMemberDetails}
                            >
                                ×
                            </button>
                        </header>

                        <dl className={styles.detailsGrid}>
                            <div><dt>Display name</dt><dd>{memberDetails.display_name || '—'}</dd></div>
                            <div><dt>Username</dt><dd>{memberDetails.username || '—'}</dd></div>
                            <div><dt>First name</dt><dd>{memberDetails.first_name || '—'}</dd></div>
                            <div><dt>Last name</dt><dd>{memberDetails.last_name || '—'}</dd></div>
                            <div><dt>Country</dt><dd>{memberDetails.country || '—'}</dd></div>
                            <div><dt>City</dt><dd>{memberDetails.city || '—'}</dd></div>
                            <div><dt>Phone</dt><dd>{memberDetails.phone || '—'}</dd></div>
                            <div><dt>Email</dt><dd>{memberDetails.email || '—'}</dd></div>
                            <div><dt>Role</dt><dd>{memberDetails.role || 'user'}</dd></div>
                            <div><dt>Account status</dt><dd>{memberDetails.account_status || 'active'}</dd></div>
                            <div><dt>Joined</dt><dd>{formatDate(memberDetails.auth_created_at || memberDetails.profile_created_at)}</dd></div>
                            <div><dt>Last sign-in</dt><dd>{formatDate(memberDetails.last_sign_in_at)}</dd></div>
                            <div><dt>Email confirmed</dt><dd>{formatDate(memberDetails.email_confirmed_at)}</dd></div>
                            <div><dt>Stories</dt><dd>{memberDetails.stories_count ?? 0}</dd></div>
                            <div><dt>Files</dt><dd>{memberDetails.files_count ?? 0}</dd></div>
                        </dl>

                        <div className={styles.bioBlock}>
                            <span>Bio</span>
                            <p>{memberDetails.bio || 'No bio provided.'}</p>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}

export default AdminPage;
