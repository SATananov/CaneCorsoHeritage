import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../../context/languageContext';
import { getTranslation } from '../../i18n/translations';
import {
    fetchStoryRatings,
    saveStoryRating,
} from '../../services/ratingService';
import styles from '../../pages/DetailsPage.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function StoryRating({ storyId, user, isOwnStory }) {
    return (
        <StoryRatingForTarget
            key={JSON.stringify([storyId, user?.id ?? null, isOwnStory])}
            storyId={storyId}
            user={user}
            isOwnStory={isOwnStory}
        />
    );
}

function StoryRatingForTarget({ storyId, user, isOwnStory }) {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const [ratingInfo, setRatingInfo] = useState({ average: 0, count: 0, userRating: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const scopeRef = useRef(null);
    const canRate = Boolean(user && !isOwnStory);

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
                const data = await fetchStoryRatings(
                    storyId,
                    user?.id,
                    { signal: controller.signal },
                );

                if (scope.active) {
                    scope.info = data;
                    scope.ready = true;
                    setRatingInfo(data);
                    setLoading(false);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && scope.active) {
                    setError('storyRatingLoadError');
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
    }, [storyId, user?.id]);

    const retryHandler = () => scopeRef.current?.reload();

    const ratingHandler = async (rating) => {
        const scope = scopeRef.current;
        if (!canRate || !scope?.active || !scope.ready || scope.busy) return;

        scope.busy = true;
        scope.ready = false;
        setSaving(true);
        setError('');
        let saved = false;

        try {
            await saveStoryRating(
                storyId,
                user.id,
                rating,
                scope.info.userRating > 0,
            );
            saved = true;

            if (!scope.active) return;

            const nextRatingInfo = await fetchStoryRatings(storyId, user.id);
            if (!scope.active) return;

            scope.info = nextRatingInfo;
            scope.ready = true;
            setRatingInfo(nextRatingInfo);
            setLoading(false);
        } catch {
            if (scope.active) {
                // Re-read before another write: even a failed request may have committed.
                setLoading(true);
                setError(saved ? 'storyRatingLoadError' : 'saveRatingError');
            }
        } finally {
            scope.busy = false;
            if (scope.active) setSaving(false);
        }
    };

    return (
        <section
            className={styles.ratingSection}
            aria-labelledby="story-rating-title"
        >
            <div className={styles.ratingHeading}>
                <div>
                    <p className={styles.ratingKicker}>
                        {t('readerRating')}
                    </p>
                    <h2 id="story-rating-title">
                        {t('rateStory')}
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
                        aria-label={format('rateOutOf', { value })}
                        aria-pressed={ratingInfo.userRating === value}
                        disabled={!canRate || saving || loading}
                        onClick={() => ratingHandler(value)}
                    >
                        ★
                    </button>
                ))}
            </div>

            {isOwnStory ? (
                <p className={styles.ratingNote}>
                    {t('ownStory')}
                </p>
            ) : user ? (
                <p className={styles.ratingNote}>
                    {ratingInfo.userRating > 0
                        ? format('yourRating', { rating: ratingInfo.userRating })
                        : t('chooseRating')}
                </p>
            ) : (
                <p className={styles.ratingNote}>
                    <Link to="/login">{t('signIn')}</Link> {t('signInToRate')}
                </p>
            )}

            {saving && (
                <p
                    className={styles.ratingStatus}
                    role="status"
                >
                    {t('saving')}
                </p>
            )}

            {error && (
                <p
                    className={styles.ratingError}
                    role="alert"
                >
                    {t(error)}
                </p>
            )}

            {error && loading && (
                <button
                    type="button"
                    onClick={retryHandler}
                    disabled={saving}
                >
                    {t('storyRatingRetry')}
                </button>
            )}
        </section>
    );
}

export default StoryRating;
