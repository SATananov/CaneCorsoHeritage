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

function ProfileCompletionNotice() {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'completion', key),
        [language],
    );
    const {
        user,
        loading,
        roleLoading,
        isActive,
    } = useAuth();

    const [completionState, setCompletionState] = useState({
        userId: null,
        loaded: false,
        details: null,
    });

    useEffect(() => {
        if (!user?.id) {
            return undefined;
        }

        const userId = user.id;
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
                    userId,
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
    }, [user?.id]);

    const missingFields = useMemo(() => {
        if (
            !user?.id
            || completionState.userId !== user.id
            || !completionState.loaded
        ) {
            return [];
        }

        return requiredFieldKeys
            .filter(([key]) => !completionState.details?.[key]?.trim())
            .map(([, labelKey]) => t(labelKey));
    }, [completionState, user?.id, t]);

    if (
        loading
        || roleLoading
        || !user
        || !isActive
        || completionState.userId !== user.id
        || !completionState.loaded
        || missingFields.length === 0
    ) {
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
                    to={`/users/${user.id}`}
                >
                    {t('action')}
                </NavLink>
            </div>
        </aside>
    );
}

export default ProfileCompletionNotice;
