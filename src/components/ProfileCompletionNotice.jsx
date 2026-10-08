import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchOwnPrivateProfileDetails } from '../services/profileService';
import { subscribeProfileRefresh } from '../services/profileRefresh';

const requiredFieldKeys = [
    ['first_name', 'firstName'],
    ['last_name', 'lastName'],
    ['country', 'country'],
    ['city', 'city'],
];

function ActiveProfileCompletionNotice({ userId }) {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'completion', key),
        [language],
    );
    const [completionState, setCompletionState] = useState({
        loaded: false,
        details: null,
    });

    useEffect(() => {
        let activeController;

        async function loadCompletionState() {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;

            try {
                const details = await fetchOwnPrivateProfileDetails(
                    userId,
                    { signal: controller.signal },
                );

                if (controller.signal.aborted) {
                    return;
                }

                setCompletionState({
                    loaded: true,
                    details,
                });
            } catch (error) {
                if (!controller.signal.aborted && error?.name !== 'AbortError') {
                    console.warn('Unable to check profile completion.', error);
                }
            }
        }

        loadCompletionState();
        const unsubscribe = subscribeProfileRefresh(userId, loadCompletionState);

        return () => {
            unsubscribe();
            activeController?.abort();
        };
    }, [userId]);

    const missingFields = useMemo(() => {
        if (!completionState.loaded) {
            return [];
        }

        return requiredFieldKeys
            .filter(([key]) => !completionState.details?.[key]?.trim())
            .map(([, labelKey]) => t(labelKey));
    }, [completionState, t]);

    if (!completionState.loaded || missingFields.length === 0) {
        return null;
    }

    return (
        <aside className="profile-completion-notice" aria-live="polite">
            <div className="site-container profile-completion-notice-inner">
                <div className="profile-completion-copy">
                    <span className="profile-completion-kicker">
                        {t('incomplete')}
                    </span>
                    <strong>{t('completeTitle')}</strong>
                    <p>
                        {t('missing')}{' '}
                        {missingFields.join(', ')}.
                    </p>
                </div>

                <NavLink
                    className="profile-completion-action"
                    to={`/users/${userId}`}
                >
                    {t('action')}
                </NavLink>
            </div>
        </aside>
    );
}

function ProfileCompletionNotice() {
    const {
        user,
        loading,
        roleLoading,
        isActive,
    } = useAuth();

    if (loading || roleLoading || !user?.id || !isActive) {
        return null;
    }

    return <ActiveProfileCompletionNotice key={user.id} userId={user.id} />;
}

export default ProfileCompletionNotice;
