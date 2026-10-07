import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import {
    fetchFileRatings,
    saveFileRating,
} from '../services/fileRatingService';
import styles from './MediaRating.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function MediaRating({ fileId, ownerId }) {
    const { user } = useAuth();
    return (
        <MediaRatingForTarget
            key={JSON.stringify([fileId, user?.id ?? null, ownerId])}
            fileId={fileId}
            ownerId={ownerId}
            user={user}
        />
    );
}

function MediaRatingForTarget({ fileId, ownerId, user }) {
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'mediaRating', key), [language]);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const [ratingInfo, setRatingInfo] = useState({ average: 0, count: 0, userRating: 0 });
    // Unknown state stays gated after errors until a successful reload.
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const scopeRef = useRef(null);
    const isOwnFile = Boolean(user?.id && ownerId && user.id === ownerId);

    useEffect(() => {
        const controller = new AbortController();
        const scope = { active: true, busy: false, ready: false, info: null };
        scopeRef.current = scope;

        const loadRatings = async () => {
            if (!scope.active || scope.busy) return;
            scope.busy = true;
            scope.ready = false;
            setLoading(true);
            setError('');
            try {
                const data = await fetchFileRatings(
                    fileId, user?.id, { signal: controller.signal },
                );
                if (scope.active) {
                    scope.info = data;
                    scope.ready = true;
                    setRatingInfo(data);
                    setLoading(false);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && scope.active) {
                    setError('loadError');
                }
            } finally {
                scope.busy = false;
            }
        };

        scope.reload = loadRatings;
        loadRatings();
        return () => {
            scope.active = false;
            controller.abort();
        };
    }, [fileId, user?.id]);

    const retryHandler = () => scopeRef.current?.reload();

    const ratingHandler = async (rating) => {
        const scope = scopeRef.current;
        if (!(user && !isOwnFile) || !scope?.active || !scope.ready || scope.busy) return;

        // Lock synchronously, including before React renders the disabled buttons.
        scope.busy = true;
        scope.ready = false;
        setSaving(true);
        setError('');
        let saved = false;
        try {
            await saveFileRating(fileId, user.id, rating, scope.info.userRating > 0);
            saved = true;
            if (!scope.active) return;

            const next = await fetchFileRatings(fileId, user.id);
            if (!scope.active) return;
            scope.info = next;
            scope.ready = true;
            setRatingInfo(next);
        } catch {
            if (scope.active) {
                // Re-read before another write: even a failed request may have committed.
                setLoading(true);
                setError(saved ? 'loadError' : 'saveError');
            }
        } finally {
            scope.busy = false;
            if (scope.active) setSaving(false);
        }
    };

    return (
        <div className={styles.rating}>
            <div className={styles.summary}>
                {ratingInfo.count > 0 ? (
                    <>
                        <strong>{ratingInfo.average.toFixed(1)} / 5</strong>
                        <span>
                            {ratingInfo.count}{' '}
                            {ratingInfo.count === 1 ? t('rating') : t('ratings')}
                        </span>
                    </>
                ) : (
                    <>
                        <strong>{t('new')}</strong>
                        <span>{t('noRatings')}</span>
                    </>
                )}
            </div>

            <div className={styles.stars} aria-label={t('label')}>
                {ratingValues.map((value) => (
                    <button
                        className={
                            value <= ratingInfo.userRating
                                ? `${styles.star} ${styles.starActive}`
                                : styles.star
                        }
                        key={value}
                        type="button"
                        aria-label={format('rateOutOf', { value })}
                        aria-pressed={ratingInfo.userRating === value}
                        disabled={!user || saving || loading || isOwnFile}
                        onClick={() => ratingHandler(value)}
                    >
                        ★
                    </button>
                ))}
            </div>

            {isOwnFile ? (
                <span className={styles.note}>
                    {t('ownFile')}
                </span>
            ) : user ? (
                <span className={styles.note}>
                    {ratingInfo.userRating > 0
                        ? format('yourRating', { rating: ratingInfo.userRating })
                        : t('rateFile')}
                </span>
            ) : (
                <span className={styles.note}>
                    <Link to="/login">{t('signIn')}</Link> {t('signInToRate')}
                </span>
            )}

            {saving && <span className={styles.status}>{t('saving')}</span>}
            {error && <span className={styles.error}>{t(error)}</span>}
            {error && loading && (
                <button type="button" onClick={retryHandler} disabled={saving}>
                    {t('retry')}
                </button>
            )}
        </div>
    );
}

export default MediaRating;
