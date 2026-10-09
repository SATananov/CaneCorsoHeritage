import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminOverviewSection from '../components/admin/AdminOverviewSection';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
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

const sections = ['overview', 'pending', 'members', 'stories', 'files', 'ratings'];

function formatDate(value, language) {
    if (!value) {
        return '—';
    }

    const locale = language === 'bg' ? 'bg-BG' : language === 'it' ? 'it-IT' : 'en-GB';

    return new Intl.DateTimeFormat(locale, {
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
    const { user, isAdmin, accountStatus } = useAuth();
    return (
        <AdminDashboard
            key={JSON.stringify([user?.id ?? null, isAdmin, accountStatus])}
            user={user}
        />
    );
}

function AdminDashboard({ user }) {
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'admin', key), [language]);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const statusLabel = (value) => {
        if (!value) return '—';
        const key = `status${value.charAt(0).toUpperCase()}${value.slice(1).replaceAll('_', '')}`;
        const translated = t(key);
        return translated === key ? value.replaceAll('_', ' ') : translated;
    };
    const dateLabel = (value) => formatDate(value, language);
    const [activeSection, setActiveSection] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyKey, setBusyKey] = useState('');
    const [memberDetails, setMemberDetails] = useState(null);
    const [memberDetailsLoading, setMemberDetailsLoading] = useState(false);
    const scopeRef = useRef(null);

    useEffect(() => {
        const scope = { active: true, request: 0, action: false, details: 0 };
        scopeRef.current = scope;
        async function reload(afterAction = false) {
            if (!scope.active || (scope.action && !afterAction)) return false;
            scope.controller?.abort();
            const controller = new AbortController();
            scope.controller = controller;
            const request = ++scope.request;
            const isCurrent = () => scope.active && scope.request === request;
            setLoading(true);
            setError('');
            if (!afterAction) setMessage('');
            try {
                const nextData = await fetchAdminDashboard({ signal: controller.signal });
                if (!isCurrent()) return false;
                // Publish queues and counts together, only from the latest full cycle.
                setData(nextData);
                return true;
            } catch (loadError) {
                if (isCurrent() && loadError.name !== 'AbortError') setError('loadError');
                return false;
            } finally {
                if (isCurrent()) setLoading(false);
            }
        }
        scope.reload = reload;
        reload();
        return () => {
            scope.active = false;
            scope.controller?.abort();
        };
    }, []);

    async function refreshDashboard(afterAction = false) {
        return scopeRef.current?.reload(afterAction) ?? false;
    }

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

    const pendingStories = data?.pendingStories ?? [];
    const pendingFiles = data?.pendingFiles ?? [];
    const actionsDisabled = Boolean(busyKey) || error === 'loadError';

    async function runAction(key, successMessage, action) {
        const scope = scopeRef.current;
        if (!scope?.active || scope.action) return;
        // Lock before React renders disabled controls; invalidate pre-mutation reads.
        scope.action = true;
        scope.request += 1;
        scope.controller?.abort();
        try {
            setLoading(false);
            setBusyKey(key);
            setError('');
            setMessage('');
            await action();
            if (!scope.active) return;
            setMessage(successMessage);
            await refreshDashboard(true);
        } catch {
            if (scope.active) setError('actionError');
        } finally {
            scope.action = false;
            if (scope.active) setBusyKey('');
        }
    }

    function confirmAndRun(prompt, key, successMessage, action) {
        if (!window.confirm(prompt)) {
            return;
        }

        runAction(key, successMessage, action);
    }

    async function openMemberDetails(profile) {
        const scope = scopeRef.current;
        if (!scope?.active) return;
        const request = ++scope.details;
        const isCurrent = () => scope.active && scope.details === request;
        try {
            setMemberDetailsLoading(true);
            setError('');
            const details = await fetchAdminMemberDetails(profile.id);

            if (!isCurrent()) return;
            setMemberDetails({
                ...details,
                display_name: details?.display_name || profile.display_name || null,
                username: details?.username || profile.username || null,
                profile_created_at: details?.profile_created_at || profile.created_at || null,
                stories_count: (data?.stories ?? []).filter((story) => story.author_id === profile.id).length,
                files_count: (data?.files ?? []).filter((file) => file.user_id === profile.id).length,
            });
        } catch {
            if (isCurrent()) setError('detailsLoadError');
        } finally {
            if (isCurrent()) setMemberDetailsLoading(false);
        }
    }

    function closeMemberDetails() {
        if (scopeRef.current) scopeRef.current.details += 1;
        setMemberDetailsLoading(false);
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
                            disabled={actionsDisabled}
                            onClick={() => runAction(
                                `${keyPrefix}-approve`,
                                t('storyApproved'),
                                () => moderateStory(story.id, 'approved'),
                            )}
                        >
                            {t('approve')}
                        </button>
                        <button
                            className={styles.rejectButton}
                            type="button"
                            disabled={actionsDisabled}
                            onClick={() => confirmAndRun(
                                format('rejectStoryConfirm', { name: story.title || t('untitled') }),
                                `${keyPrefix}-reject`,
                                t('storyRejected'),
                                () => moderateStory(story.id, 'rejected'),
                            )}
                        >
                            {t('reject')}
                        </button>
                    </>
                )}

                {story.visibility === 'community' && story.moderation_status === 'approved' && (
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => confirmAndRun(
                            format('hideStoryConfirm', { name: story.title || t('untitled') }),
                            `${keyPrefix}-hide`,
                            t('storyHidden'),
                            () => moderateStory(story.id, 'hidden'),
                        )}
                    >
                        {t('hide')}
                    </button>
                )}

                {story.visibility === 'community' && ['hidden', 'rejected'].includes(story.moderation_status) && (
                    <button
                        className={styles.approveButton}
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => runAction(
                            `${keyPrefix}-restore`,
                            t('storyRestored'),
                            () => moderateStory(story.id, 'approved'),
                        )}
                    >
                        {t('restore')}
                    </button>
                )}

                <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={actionsDisabled}
                    onClick={() => confirmAndRun(
                        format('deleteStoryConfirm', { name: story.title || t('untitled') }),
                        `${keyPrefix}-delete`,
                        t('storyDeleted'),
                        () => adminDeleteStory(story.id),
                    )}
                >
                    {t('delete')}
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
                            disabled={actionsDisabled}
                            onClick={() => runAction(
                                `${keyPrefix}-approve`,
                                t('fileApproved'),
                                () => moderateFile(file.id, 'approved'),
                            )}
                        >
                            {t('approve')}
                        </button>
                        <button
                            className={styles.rejectButton}
                            type="button"
                            disabled={actionsDisabled}
                            onClick={() => confirmAndRun(
                                format('rejectFileConfirm', { name: file.file_name }),
                                `${keyPrefix}-reject`,
                                t('fileRejected'),
                                () => moderateFile(file.id, 'rejected'),
                            )}
                        >
                            {t('reject')}
                        </button>
                    </>
                )}

                {file.visibility === 'community' && file.moderation_status === 'approved' && (
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => confirmAndRun(
                            format('hideFileConfirm', { name: file.file_name }),
                            `${keyPrefix}-hide`,
                            t('fileHidden'),
                            () => moderateFile(file.id, 'hidden'),
                        )}
                    >
                        {t('hide')}
                    </button>
                )}

                {file.visibility === 'community' && ['hidden', 'rejected'].includes(file.moderation_status) && (
                    <button
                        className={styles.approveButton}
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => runAction(
                            `${keyPrefix}-restore`,
                            t('fileRestored'),
                            () => moderateFile(file.id, 'approved'),
                        )}
                    >
                        {t('restore')}
                    </button>
                )}

                <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={actionsDisabled}
                    onClick={() => confirmAndRun(
                        format('deleteFileConfirm', { name: file.file_name }),
                        `${keyPrefix}-delete`,
                        t('fileDeleted'),
                        () => adminDeleteFile(file),
                    )}
                >
                    {t('delete')}
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <main className={styles.page}>
                <div className="site-container">
                    <LoadingSpinner label={t('loading')} />
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={`site-container ${styles.shell}`}>
                <aside className={styles.sidebar} aria-label={t('navLabel')}>
                    <div className={styles.sidebarHeading}>
                        <span>USG</span>
                        <strong>{t('administration')}</strong>
                    </div>

                    <nav className={styles.adminNav}>
                        {sections.map((id) => (
                            <button
                                key={id}
                                className={activeSection === id ? styles.activeNavButton : styles.navButton}
                                type="button"
                                onClick={() => {
                                    setActiveSection(id);
                                    if (error === 'loadError') refreshDashboard();
                                }}
                            >
                                {t(id === 'pending' ? 'pendingApprovals' : id)}
                                {id === 'pending' && data?.counts.pending > 0 && (
                                    <span className={styles.navCount}>{data.counts.pending}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <NavLink className={styles.backLink} to="/">
                        {t('backWebsite')}
                    </NavLink>
                </aside>

                <section className={styles.content}>
                    <header className={styles.header}>
                        <div>
                            <p className={styles.eyebrow}>Cane Corso Heritage</p>
                            <h1>{t('administration')}</h1>
                        </div>
                    </header>

                    {message && (
                        <div className={styles.success} role="status">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className={styles.error} role="alert">
                            {t(error)}
                        </div>
                    )}

                    {data && activeSection === 'overview' && (
                        <AdminOverviewSection
                            counts={data.counts}
                            t={t}
                        />
                    )}

                    {data && activeSection === 'pending' && (
                        <section aria-labelledby="admin-pending-title">
                            <h2 id="admin-pending-title" className={styles.sectionTitle}>{t('pendingApprovals')}</h2>
                            <p className={styles.sectionIntro}>
                                {t('pendingIntro')}
                            </p>

                            <h3 className={styles.subsectionTitle}>{t('stories')} · {data.counts.pendingStories}</h3>
                            {pendingStories.length === 0 ? (
                                <p className={styles.emptyQueue}>{t('noPendingStories')}</p>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>{t('title')}</th><th>{t('author')}</th><th>{t('created')}</th><th>{t('actions')}</th></tr></thead>
                                        <tbody>
                                            {pendingStories.map((story) => (
                                                <tr key={story.id}>
                                                    <td>{story.title || t('untitled')}</td>
                                                    <td>{memberNameById.get(story.author_id) ?? <span className={styles.unlinkedMember}>{t('noLinkedProfile')}</span>}</td>
                                                    <td>{dateLabel(story.created_at)}</td>
                                                    <td>{storyActions(story)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <h3 className={styles.subsectionTitle}>{t('files')} · {data.counts.pendingFiles}</h3>
                            {pendingFiles.length === 0 ? (
                                <p className={styles.emptyQueue}>{t('noPendingFiles')}</p>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>{t('file')}</th><th>{t('owner')}</th><th>{t('type')}</th><th>{t('created')}</th><th>{t('actions')}</th></tr></thead>
                                        <tbody>
                                            {pendingFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td>{file.file_name}</td>
                                                    <td>{memberNameById.get(file.user_id) ?? <span className={styles.unlinkedMember}>{t('noLinkedProfile')}</span>}</td>
                                                    <td>{file.mime_type || '—'}</td>
                                                    <td>{dateLabel(file.created_at)}</td>
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
                            <h2 id="admin-members-title" className={styles.sectionTitle}>{t('members')}</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>{t('member')}</th><th>{t('username')}</th><th>{t('role')}</th><th>{t('account')}</th><th>{t('joined')}</th><th>{t('actions')}</th></tr></thead>
                                    <tbody>
                                        {data.profiles.map((profile) => {
                                            const roleInfo = roleByUser.get(profile.id);
                                            const role = roleInfo?.role ?? 'unknown';
                                            const accountStatus = roleInfo?.account_status ?? 'unknown';
                                            const canChangeAccountStatus = Boolean(roleInfo)
                                                && ['active', 'inactive'].includes(accountStatus);
                                            const isCurrentAdmin = profile.id === user?.id;

                                            return (
                                                <tr key={profile.id}>
                                                    <td>{profile.display_name || '—'}</td>
                                                    <td>{profile.username || '—'}</td>
                                                    <td><span className={role === 'admin' ? styles.adminRole : styles.userRole}>{statusLabel(role)}</span></td>
                                                    <td><span className={accountStatus === 'active' ? styles.activeStatus : accountStatus === 'inactive' ? styles.inactiveStatus : styles.userRole}>{statusLabel(accountStatus)}</span></td>
                                                    <td>{dateLabel(profile.created_at)}</td>
                                                    <td>
                                                        <div className={styles.rowActions}>
                                                            <button
                                                                className={styles.secondaryButton}
                                                                type="button"
                                                                disabled={memberDetailsLoading}
                                                                onClick={() => openMemberDetails(profile)}
                                                            >
                                                                {t('details')}
                                                            </button>
                                                            {isCurrentAdmin ? (
                                                                <span className={styles.currentAdmin}>{t('currentAdmin')}</span>
                                                            ) : canChangeAccountStatus ? (
                                                                <button
                                                                    className={accountStatus === 'active' ? styles.rejectButton : styles.approveButton}
                                                                    type="button"
                                                                    disabled={actionsDisabled}
                                                                    onClick={() => confirmAndRun(
                                                                        format('deactivateConfirm', { action: accountStatus === 'active' ? t('deactivate') : t('reactivate'), name: profile.display_name || profile.username || t('memberFallback') }),
                                                                        `member-${profile.id}-${accountStatus}`,
                                                                        accountStatus === 'active' ? t('deactivated') : t('reactivated'),
                                                                        () => setMemberAccountStatus(
                                                                            profile.id,
                                                                            accountStatus === 'active' ? 'inactive' : 'active',
                                                                        ),
                                                                    )}
                                                                >
                                                                    {accountStatus === 'active' ? t('deactivate') : t('reactivate')}
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </td>
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
                    )}

                    {data && activeSection === 'stories' && (
                        <section aria-labelledby="admin-stories-title">
                            <h2 id="admin-stories-title" className={styles.sectionTitle}>{t('stories')}</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>{t('title')}</th><th>{t('author')}</th><th>{t('visibility')}</th><th>{t('moderation')}</th><th>{t('created')}</th><th>{t('actions')}</th></tr></thead>
                                    <tbody>
                                        {data.stories.map((story) => (
                                            <tr key={story.id}>
                                                <td>{story.title || t('untitled')}</td>
                                                <td>{memberNameById.get(story.author_id) ?? <span className={styles.unlinkedMember}>{t('noLinkedProfile')}</span>}</td>
                                                <td>{statusLabel(story.visibility)}</td>
                                                <td><span className={`${styles.moderationStatus} ${styles[`status_${story.moderation_status || 'approved'}`]}`}>{statusLabel(story.moderation_status || 'approved')}</span></td>
                                                <td>{dateLabel(story.created_at)}</td>
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
                            <h2 id="admin-files-title" className={styles.sectionTitle}>{t('files')}</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>{t('file')}</th><th>{t('owner')}</th><th>{t('type')}</th><th>{t('size')}</th><th>{t('visibility')}</th><th>{t('moderation')}</th><th>{t('actions')}</th></tr></thead>
                                    <tbody>
                                        {data.files.map((file) => (
                                            <tr key={file.id}>
                                                <td>{file.file_name}</td>
                                                <td>{memberNameById.get(file.user_id) ?? <span className={styles.unlinkedMember}>{t('noLinkedProfile')}</span>}</td>
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
                            <h2 id="admin-ratings-title" className={styles.sectionTitle}>{t('ratings')}</h2>
                            <div className={styles.ratingColumns}>
                                <article className={styles.panel}>
                                    <h3>{t('storyRatings')}</h3>
                                    {data.storyRatings.length === 0 ? <p>{t('noStoryRatings')}</p> : data.storyRatings.map((rating) => (
                                        <p key={`${rating.story_id}-${rating.user_id}`}>{memberNameById.get(rating.user_id) ?? t('member')} · {rating.rating}/5</p>
                                    ))}
                                </article>
                                <article className={styles.panel}>
                                    <h3>{t('fileRatings')}</h3>
                                    {data.fileRatings.length === 0 ? <p>{t('noFileRatings')}</p> : data.fileRatings.map((rating) => (
                                        <p key={`${rating.file_id}-${rating.user_id}`}>{memberNameById.get(rating.user_id) ?? t('member')} · {rating.rating}/5</p>
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
                                <p className={styles.eyebrow}>{t('memberDetails')}</p>
                                <h2 id="admin-member-details-title">
                                    {memberDetails.display_name || memberDetails.username || t('member')}
                                </h2>
                            </div>
                            <button
                                className={styles.closeButton}
                                type="button"
                                aria-label={t('closeMemberDetails')}
                                onClick={closeMemberDetails}
                            >
                                ×
                            </button>
                        </header>

                        <dl className={styles.detailsGrid}>
                            <div><dt>{t('displayName')}</dt><dd>{memberDetails.display_name || '—'}</dd></div>
                            <div><dt>{t('username')}</dt><dd>{memberDetails.username || '—'}</dd></div>
                            <div><dt>{t('firstName')}</dt><dd>{memberDetails.first_name || '—'}</dd></div>
                            <div><dt>{t('lastName')}</dt><dd>{memberDetails.last_name || '—'}</dd></div>
                            <div><dt>{t('country')}</dt><dd>{memberDetails.country || '—'}</dd></div>
                            <div><dt>{t('city')}</dt><dd>{memberDetails.city || '—'}</dd></div>
                            <div><dt>{t('phone')}</dt><dd>{memberDetails.phone || '—'}</dd></div>
                            <div><dt>{t('email')}</dt><dd>{memberDetails.email || '—'}</dd></div>
                            <div><dt>{t('role')}</dt><dd>{statusLabel(memberDetails.role || 'user')}</dd></div>
                            <div><dt>{t('accountStatus')}</dt><dd>{statusLabel(memberDetails.account_status || 'active')}</dd></div>
                            <div><dt>{t('joined')}</dt><dd>{dateLabel(memberDetails.auth_created_at || memberDetails.profile_created_at)}</dd></div>
                            <div><dt>{t('lastSignIn')}</dt><dd>{dateLabel(memberDetails.last_sign_in_at)}</dd></div>
                            <div><dt>{t('emailConfirmed')}</dt><dd>{dateLabel(memberDetails.email_confirmed_at)}</dd></div>
                            <div><dt>{t('stories')}</dt><dd>{memberDetails.stories_count ?? 0}</dd></div>
                            <div><dt>{t('files')}</dt><dd>{memberDetails.files_count ?? 0}</dd></div>
                        </dl>

                        <div className={styles.bioBlock}>
                            <span>{t('bio')}</span>
                            <p>{memberDetails.bio || t('noBio')}</p>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}

export default AdminPage;
