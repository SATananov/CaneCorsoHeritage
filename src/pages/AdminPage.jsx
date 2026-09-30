import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchAdminDashboard } from '../services/adminService';
import styles from './AdminPage.module.css';

const sections = [
    ['overview', 'Overview'],
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

function AdminPage() {
    const [activeSection, setActiveSection] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadDashboard() {
            setLoading(true);
            setError('');

            try {
                const nextData = await fetchAdminDashboard({ signal: controller.signal });
                setData(nextData);
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
            result.set(item.user_id, item.role);
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
                        <span className={styles.readOnlyBadge}>Read-only v1</span>
                    </header>

                    {error && (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    )}

                    {!error && data && activeSection === 'overview' && (
                        <section aria-labelledby="admin-overview-title">
                            <h2 id="admin-overview-title" className={styles.sectionTitle}>Overview</h2>
                            <div className={styles.statsGrid}>
                                <article className={styles.statCard}><span>Members</span><strong>{data.counts.members}</strong></article>
                                <article className={styles.statCard}><span>Stories</span><strong>{data.counts.stories}</strong></article>
                                <article className={styles.statCard}><span>Files</span><strong>{data.counts.files}</strong></article>
                                <article className={styles.statCard}><span>Ratings</span><strong>{data.counts.ratings}</strong></article>
                            </div>
                            <p className={styles.note}>
                                This first administration checkpoint is intentionally read-only. It verifies administrator access and gives a safe overview before moderation actions are introduced.
                            </p>
                        </section>
                    )}

                    {!error && data && activeSection === 'members' && (
                        <section aria-labelledby="admin-members-title">
                            <h2 id="admin-members-title" className={styles.sectionTitle}>Members</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>Member</th><th>Username</th><th>Role</th><th>Joined</th></tr></thead>
                                    <tbody>
                                        {data.profiles.map((profile) => (
                                            <tr key={profile.id}>
                                                <td>{profile.display_name || '—'}</td>
                                                <td>{profile.username || '—'}</td>
                                                <td><span className={roleByUser.get(profile.id) === 'admin' ? styles.adminRole : styles.userRole}>{roleByUser.get(profile.id) ?? 'user'}</span></td>
                                                <td>{formatDate(profile.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {!error && data && activeSection === 'stories' && (
                        <section aria-labelledby="admin-stories-title">
                            <h2 id="admin-stories-title" className={styles.sectionTitle}>Stories</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>Title</th><th>Author</th><th>Status</th><th>Visibility</th><th>Created</th></tr></thead>
                                    <tbody>
                                        {data.stories.map((story) => (
                                            <tr key={story.id}>
                                                <td>{story.title || 'Untitled'}</td>
                                                <td>{memberNameById.get(story.author_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                <td>{story.status || '—'}</td>
                                                <td>{story.visibility || '—'}</td>
                                                <td>{formatDate(story.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {!error && data && activeSection === 'files' && (
                        <section aria-labelledby="admin-files-title">
                            <h2 id="admin-files-title" className={styles.sectionTitle}>Files</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>File</th><th>Owner</th><th>Type</th><th>Size</th><th>Visibility</th></tr></thead>
                                    <tbody>
                                        {data.files.map((file) => (
                                            <tr key={file.id}>
                                                <td>{file.file_name}</td>
                                                <td>{memberNameById.get(file.user_id) ?? <span className={styles.unlinkedMember}>No linked profile</span>}</td>
                                                <td>{file.mime_type || '—'}</td>
                                                <td>{formatBytes(file.file_size)}</td>
                                                <td>{file.visibility || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {!error && data && activeSection === 'ratings' && (
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
        </main>
    );
}

export default AdminPage;
