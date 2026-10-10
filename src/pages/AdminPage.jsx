import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminOverviewSection from '../components/admin/AdminOverviewSection';
import AdminRatingsSection from '../components/admin/AdminRatingsSection';
import AdminPendingSection from '../components/admin/AdminPendingSection';
import AdminStoriesSection from '../components/admin/AdminStoriesSection';
import AdminFilesSection from '../components/admin/AdminFilesSection';
import AdminMembersSection from '../components/admin/AdminMembersSection';
import AdminMemberDetailsModal from '../components/admin/AdminMemberDetailsModal';
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
    addFileSignedUrls,
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

                // Preserve the dashboard publication contract: queues and counts
                // become available atomically as soon as the admin fetch completes.
                setData(nextData);

                // File preview URLs are secondary UI enrichment and must not delay
                // or invalidate the dashboard's moderation/queue state.
                try {
                    const filesWithUrls = await addFileSignedUrls(nextData.files ?? []);
                    if (!isCurrent()) return true;

                    setData((currentData) => (
                        currentData
                            ? {
                                ...currentData,
                                files: filesWithUrls,
                            }
                            : currentData
                    ));
                } catch {
                    // Keep the dashboard usable even if signed URL creation fails.
                }

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
        scope.action = true;
        scope.request += 1;
        scope.controller?.abort();
        try {
            setLoading(false);
            setBusyKey(key);
            setError('');
            setMessage('');
            const result = await action();
            if (!scope.active) return;
            setMessage(result?.cleanupPending ? t('cleanupPending') : successMessage);
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


    function memberActions(profile, roleInfo) {
        const accountStatus = roleInfo?.account_status ?? 'unknown';
        const canChangeAccountStatus = Boolean(roleInfo)
            && ['active', 'inactive'].includes(accountStatus);
        const isCurrentAdmin = profile.id === user?.id;

        return (
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
                            format('deactivateConfirm', {
                                action: accountStatus === 'active' ? t('deactivate') : t('reactivate'),
                                name: profile.display_name || profile.username || t('memberFallback'),
                            }),
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
        );
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
                        <AdminPendingSection
                            pendingStories={pendingStories}
                            pendingFiles={pendingFiles}
                            pendingStoriesCount={data.counts.pendingStories}
                            pendingFilesCount={data.counts.pendingFiles}
                            memberNameById={memberNameById}
                            dateLabel={dateLabel}
                            renderStoryActions={storyActions}
                            renderFileActions={fileActions}
                            t={t}
                        />
                    )}

                    {data && activeSection === 'members' && (
                        <AdminMembersSection
                            profiles={data.profiles}
                            roleByUser={roleByUser}
                            statusLabel={statusLabel}
                            dateLabel={dateLabel}
                            renderMemberActions={memberActions}
                            t={t}
                        />
                    )}

                    {data && activeSection === 'stories' && (
                        <AdminStoriesSection
                            stories={data.stories}
                            memberNameById={memberNameById}
                            statusLabel={statusLabel}
                            dateLabel={dateLabel}
                            renderStoryActions={storyActions}
                            t={t}
                        />
                    )}

                    {data && activeSection === 'files' && (
                        <AdminFilesSection
                            files={data.files}
                            memberNameById={memberNameById}
                            statusLabel={statusLabel}
                            formatBytes={formatBytes}
                            renderFileActions={fileActions}
                            t={t}
                        />
                    )}

                    {data && activeSection === 'ratings' && (
                        <AdminRatingsSection
                            storyRatings={data.storyRatings}
                            fileRatings={data.fileRatings}
                            memberNameById={memberNameById}
                            t={t}
                        />
                    )}
                </section>
            </div>

            {memberDetails && (
                <AdminMemberDetailsModal
                    memberDetails={memberDetails}
                    statusLabel={statusLabel}
                    dateLabel={dateLabel}
                    onClose={closeMemberDetails}
                    t={t}
                />
            )}
        </main>
    );
}

export default AdminPage;
