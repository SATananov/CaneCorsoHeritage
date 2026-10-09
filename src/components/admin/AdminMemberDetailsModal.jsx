import { useEffect, useRef } from 'react';
import styles from '../../pages/AdminPage.module.css';

function AdminMemberDetailsModal({
    memberDetails,
    statusLabel,
    dateLabel,
    onClose,
    t,
}) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const focusable = Array.from(
                dialogRef.current?.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ) ?? [],
            );

            if (focusable.length === 0) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        closeButtonRef.current?.focus();
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);

            if (
                previouslyFocusedRef.current
                && typeof previouslyFocusedRef.current.focus === 'function'
            ) {
                previouslyFocusedRef.current.focus();
            }
        };
    }, [onClose]);

    return (
        <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                    onClose();
                }
            }}
        >
            <section
                ref={dialogRef}
                className={styles.memberModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-member-details-title"
                tabIndex={-1}
            >
                <header className={styles.memberModalHeader}>
                    <div>
                        <p className={styles.eyebrow}>{t('memberDetails')}</p>
                        <h2 id="admin-member-details-title">
                            {memberDetails.display_name || memberDetails.username || t('member')}
                        </h2>
                    </div>

                    <button
                        ref={closeButtonRef}
                        className={styles.closeButton}
                        type="button"
                        aria-label={t('closeMemberDetails')}
                        onClick={onClose}
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
    );
}

export default AdminMemberDetailsModal;