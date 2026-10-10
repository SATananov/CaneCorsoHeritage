import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { fetchOwnPrivateProfileDetails } from '../services/profileService';

const requiredFields = [
    'first_name',
    'last_name',
    'country',
    'city',
];

function isComplete(details) {
    return requiredFields.every(
        (field) => details?.[field]?.trim(),
    );
}

function RequireCompleteProfile() {
    const location = useLocation();
    const { user } = useAuth();
    const { language } = useLanguage();
    const [checkState, setCheckState] = useState({
        userId: null,
        checked: false,
        complete: false,
        error: false,
    });

    useEffect(() => {
        if (!user?.id) {
            return undefined;
        }

        const userId = user.id;
        const controller = new AbortController();

        async function checkProfile() {
            try {
                const details = await fetchOwnPrivateProfileDetails(
                    userId,
                    { signal: controller.signal },
                );

                if (controller.signal.aborted) {
                    return;
                }

                setCheckState({
                    userId,
                    checked: true,
                    complete: isComplete(details),
                    error: false,
                });
            } catch (error) {
                if (controller.signal.aborted || error?.name === 'AbortError') {
                    return;
                }

                console.warn('Unable to verify profile completion.', error);

                setCheckState({
                    userId,
                    checked: true,
                    complete: false,
                    error: true,
                });
            }
        }

        checkProfile();

        return () => controller.abort();
    }, [user?.id]);

    const currentState = useMemo(() => (
        checkState.userId === user?.id
            ? checkState
            : {
                userId: user?.id ?? null,
                checked: false,
                complete: false,
                error: false,
            }
    ), [checkState, user?.id]);

    if (!currentState.checked || currentState.error) {
        const messageKey = currentState.error
            ? 'profileCheckError'
            : 'checkingProfile';

        return (
            <main className="route-loading" aria-live="polite">
                <div className="site-container">
                    {getTranslation(language, 'systemUi', messageKey)}
                </div>
            </main>
        );
    }

    if (!currentState.complete) {
        return (
            <Navigate
                to={`/users/${user.id}`}
                replace
                state={{
                    profileSetupRequired: true,
                    from: location,
                }}
            />
        );
    }

    return <Outlet />;
}

export default RequireCompleteProfile;
