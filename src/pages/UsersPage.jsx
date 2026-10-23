import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import {
    fetchProfiles,
    fetchPublicContacts,
    getProfileAvatarUrl,
} from '../services/profileService';
import identityStyles from './MemberIdentity.module.css';
import styles from './UserProfiles.module.css';

const PAGE_SIZE = 9;

function getInitial(displayName) {
    return displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function UsersPage() {
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'members', key), [language]);
    const [profiles, setProfiles] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const controller = new AbortController();

        const loadProfiles = async () => {
            setLoading(true);
            setError('');
            try {
                const [profileResult, contactResult] = await Promise.allSettled([
                    fetchProfiles({ signal: controller.signal }),
                    fetchPublicContacts({ signal: controller.signal }),
                ]);

                if (controller.signal.aborted) return;

                if (profileResult.status === 'rejected') {
                    if (profileResult.reason?.name !== 'AbortError') {
                        setError(t('loadError'));
                    }
                    return;
                }

                setProfiles(profileResult.value);
                setContacts(
                    contactResult.status === 'fulfilled'
                        ? contactResult.value
                        : [],
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProfiles();

        return () => {
            controller.abort();
        };
    }, [t]);

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(language);
    const filteredProfiles = normalizedQuery
        ? profiles.filter((profile) => {
            const displayName = profile.display_name || '';
            const username = profile.username || '';

            return displayName.toLocaleLowerCase(language).includes(normalizedQuery)
                || username.toLocaleLowerCase(language).includes(normalizedQuery);
        })
        : profiles;

    const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const visibleProfiles = filteredProfiles.slice(pageStart, pageStart + PAGE_SIZE);

    function handleSearch(event) {
        setSearchQuery(event.target.value);
        setCurrentPage(1);
    }

    function changeView(nextView) {
        setViewMode(nextView);
        setCurrentPage(1);
    }

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.pageHeader}>
                    <p className={styles.eyebrow}>{t('kicker')}</p>

                    <div className={styles.titleRow}>
                        <h1>{t('title')}</h1>

                        <div
                            className={styles.viewToggle}
                            role="group"
                            aria-label={t('viewMode')}
                        >
                            <button
                                aria-label={t('gridView')}
                                aria-pressed={viewMode === 'grid'}
                                className={viewMode === 'grid' ? styles.viewButtonActive : styles.viewButton}
                                type="button"
                                onClick={() => changeView('grid')}
                                title={t('gridView')}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="6" height="6" rx="1" />
                                    <rect x="14" y="4" width="6" height="6" rx="1" />
                                    <rect x="4" y="14" width="6" height="6" rx="1" />
                                    <rect x="14" y="14" width="6" height="6" rx="1" />
                                </svg>
                            </button>

                            <button
                                aria-label={t('listView')}
                                aria-pressed={viewMode === 'list'}
                                className={viewMode === 'list' ? styles.viewButtonActive : styles.viewButton}
                                type="button"
                                onClick={() => changeView('list')}
                                title={t('listView')}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <line x1="8" y1="6" x2="20" y2="6" />
                                    <line x1="8" y1="12" x2="20" y2="12" />
                                    <line x1="8" y1="18" x2="20" y2="18" />
                                    <circle cx="4" cy="6" r="1" />
                                    <circle cx="4" cy="12" r="1" />
                                    <circle cx="4" cy="18" r="1" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <p>{t('intro')}</p>
                </header>

                {!loading && !error && profiles.length > 0 && (
                    <div className={styles.catalogToolbar}>
                        <label className={styles.searchField}>
                            <span className={styles.visuallyHidden}>{t('searchLabel')}</span>
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="16.5" y1="16.5" x2="21" y2="21" />
                            </svg>
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder={t('searchPlaceholder')}
                            />
                        </label>
                    </div>
                )}

                {loading && <LoadingSpinner label={t('loading')} />}

                {error && (
                    <div className={styles.message} role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && profiles.length === 0 && (
                    <div className={styles.message}>{t('empty')}</div>
                )}

                {!loading && !error && profiles.length > 0 && filteredProfiles.length === 0 && (
                    <div className={styles.message}>{t('noSearchResults')}</div>
                )}

                {!loading && !error && visibleProfiles.length > 0 && (
                    <>
                        <section
                            className={viewMode === 'list'
                                ? `${styles.memberGrid} ${styles.memberList}`
                                : styles.memberGrid}
                            aria-label={t('directoryLabel')}
                        >
                            {visibleProfiles.map((profile) => {
                                const avatarUrl = getProfileAvatarUrl(profile);
                                const displayName = profile.display_name || t('defaultName');
                                const contact = contacts.find(
                                    (item) => item.user_id === profile.id,
                                );

                                return (
                                    <Link
                                        className={viewMode === 'list'
                                            ? `${styles.memberCard} ${styles.memberCardList}`
                                            : styles.memberCard}
                                        key={profile.id}
                                        to={`/members/${encodeURIComponent(profile.username)}`}
                                    >
                                        <div className={styles.avatar} aria-hidden="true">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="" />
                                            ) : (
                                                <span>{getInitial(displayName)}</span>
                                            )}
                                        </div>

                                        <div className={styles.memberCopy}>
                                            <span className={styles.memberLabel}>{t('profileLabel')}</span>
                                            <h2>{displayName}</h2>
                                            <span className={identityStyles.username}>
                                                @{profile.username}
                                            </span>
                                            {contact?.email && (
                                                <span className={identityStyles.email}>
                                                    {contact.email}
                                                </span>
                                            )}
                                            <p>
                                                {profile.bio?.trim()
                                                    || t('defaultBio')}
                                            </p>
                                            <span className={styles.detailsLink}>{t('viewProfile')}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </section>

                        {totalPages > 1 && (
                            <nav className={styles.pagination} aria-label={t('paginationLabel')}>
                                <button
                                    type="button"
                                    disabled={safePage === 1}
                                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                >
                                    {t('previousPage')}
                                </button>

                                <div className={styles.pageNumbers}>
                                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                        <button
                                            key={page}
                                            type="button"
                                            aria-current={page === safePage ? 'page' : undefined}
                                            className={page === safePage ? styles.pageButtonActive : undefined}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    disabled={safePage === totalPages}
                                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                >
                                    {t('nextPage')}
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

export default UsersPage;
