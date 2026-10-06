import { useEffect, useState } from 'react';
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
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const ratingLoadError = t('heritageRatingLoadError');
    const { user, isActive } = useAuth();

    const [ratingInfo, setRatingInfo] = useState({
        average: 0,
        count: 0,
        userRating: 0,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadRatings = async () => {
            setLoading(true);
            setError('');

            try {
                const data = await fetchHeritageRatings(
                    articleSlug,
                    user?.id,
                    { signal: controller.signal },
                );

                if (active) {
                    setRatingInfo(data);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError(ratingLoadError);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadRatings();

        return () => {
            active = false;
            controller.abort();
        };
    }, [articleSlug, ratingLoadError, user?.id]);

    const canRate = Boolean(user && isActive);

    const ratingHandler = async (rating) => {
        if (!canRate) {
            return;
        }

        setSaving(true);
        setError('');

        try {
            await saveHeritageRating(
                articleSlug,
                user.id,
                rating,
                ratingInfo.userRating > 0,
            );

            const next = await fetchHeritageRatings(
                articleSlug,
                user.id,
            );

            setRatingInfo(next);
        } catch {
            setError(t('heritageRatingSaveError'));
        } finally {
            setSaving(false);
        }
    };

    const format = (template, values) => Object.entries(values).reduce(
        (result, [name, value]) => result.replace(`{${name}}`, value),
        template,
    );

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
                    {error}
                </p>
            )}
        </section>
    );
}

export default HeritageRating;


