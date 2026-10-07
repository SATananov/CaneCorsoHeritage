import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/languageContext';
import { getTranslation } from '../../i18n/translations';
import {
    fetchHeritageRatings,
    saveHeritageRating,
} from '../../services/heritageRatingService';
import styles from '../../pages/DetailsPage.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function HeritageRating({ articleSlug }) {
    const { user, isActive } = useAuth();
    return (
        <HeritageRatingForTarget
            key={JSON.stringify([articleSlug, user?.id ?? null, isActive])}
            articleSlug={articleSlug}
            isActive={isActive}
            user={user}
        />
    );
}

function HeritageRatingForTarget({ articleSlug, user, isActive }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const format = (template, values) => Object.entries(values).reduce(
        (result, [name, value]) => result.replace(`{${name}}`, value),
        template,
    );
    const [ratingInfo, setRatingInfo] = useState({ average: 0, count: 0, userRating: 0 });
    // Unknown state stays gated after errors until a successful reload.
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const scopeRef = useRef(null);
    const canRate = Boolean(user && isActive);

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
                const data = await fetchHeritageRatings(
                    articleSlug, user?.id, { signal: controller.signal },
                );
                if (scope.active) {
                    scope.info = data;
                    scope.ready = true;
                    setRatingInfo(data);
                    setLoading(false);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && scope.active) {
                    setError('heritageRatingLoadError');
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
    }, [articleSlug, user?.id]);

    const retryHandler = () => scopeRef.current?.reload();

    const ratingHandler = async (rating) => {
        const scope = scopeRef.current;
        if (!(canRate) || !scope?.active || !scope.ready || scope.busy) return;

        // Lock synchronously, including before React renders the disabled buttons.
        scope.busy = true;
        scope.ready = false;
        setSaving(true);
        setError('');
        let saved = false;
        try {
            await saveHeritageRating(articleSlug, user.id, rating, scope.info.userRating > 0);
            saved = true;
            if (!scope.active) return;

            const next = await fetchHeritageRatings(articleSlug, user.id);
            if (!scope.active) return;
            scope.info = next;
            scope.ready = true;
            setRatingInfo(next);
        } catch {
            if (scope.active) {
                // Re-read before another write: even a failed request may have committed.
                setLoading(true);
                setError(saved ? 'heritageRatingLoadError' : 'heritageRatingSaveError');
            }
        } finally {
            scope.busy = false;
            if (scope.active) setSaving(false);
        }
    };

    return (
        <section
            className={styles.ratingSection}
            aria-labelledby="heritage-rating-title"
        >
            <div className={styles.ratingHeading}>
                <div>
                    <p className={styles.ratingKicker}>
                        {t('readerRating')}
                    </p>
                    <h2 id="heritage-rating-title">
                        {t('heritageRatingTitle')}
                    </h2>
                </div>

                <div className={styles.ratingSummary}>
                    {ratingInfo.count > 0 ? (
                        <>
                            <strong>
                                {ratingInfo.average.toFixed(1)} / 5
                            </strong>
                            <span>
                                {ratingInfo.count}{' '}
                                {ratingInfo.count === 1
                                    ? t('rating')
                                    : t('ratings')}
                            </span>
                        </>
                    ) : (
                        <>
                            <strong>{t('new')}</strong>
                            <span>{t('noRatings')}</span>
                        </>
                    )}
                </div>
            </div>

            <div
                className={styles.ratingStars}
                aria-label={t('ratingLabel')}
            >
                {ratingValues.map((value) => (
                    <button
                        className={
                            value <= ratingInfo.userRating
                                ? `${styles.ratingStar} ${styles.ratingStarActive}`
                                : styles.ratingStar
                        }
                        key={value}
                        type="button"
                        aria-label={`${value} / 5`}
                        aria-pressed={ratingInfo.userRating === value}
                        disabled={!canRate || saving || loading}
                        onClick={() => ratingHandler(value)}
                    >
                        {String.fromCharCode(9733)}
                    </button>
                ))}
            </div>

            {!user ? (
                <p className={styles.ratingNote}>
                    <Link to="/login">{t('signIn')}</Link> {t('heritageRatingSignIn')}
                </p>
            ) : !isActive ? (
                <p className={styles.ratingNote}>
                    {t('heritageRatingActiveOnly')}
                </p>
            ) : (
                <p className={styles.ratingNote}>
                    {ratingInfo.userRating > 0
                        ? format(t('heritageRatingYourRating'), { rating: ratingInfo.userRating })
                        : t('heritageRatingChoose')}
                </p>
            )}

            {saving && (
                <p className={styles.ratingStatus} role="status">
                    {t('saving')}
                </p>
            )}

            {error && (
                <p className={styles.ratingError} role="alert">
                    {t(error)}
                </p>
            )}
            {error && loading && (
                <button type="button" onClick={retryHandler} disabled={saving}>
                    {t('heritageRatingRetry')}
                </button>
            )}
        </section>
    );
}

export default HeritageRating;
