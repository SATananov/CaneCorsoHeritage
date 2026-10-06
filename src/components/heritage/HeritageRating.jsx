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

const copy = {
    en: {
        title: 'Rate this article',
        signInToRate: 'to rate this article.',
        activeOnly: 'Only active members can rate this article.',
        adminReadOnly: 'Heritage articles are rated by readers.',
        chooseRating: 'Choose your rating.',
        yourRating: 'Your rating: {rating} / 5',
        loadError: 'Unable to load article ratings.',
        saveError: 'Unable to save your rating.',
    },
    bg: {
        title: 'Оценете тази статия',
        signInToRate: 'за да оцените тази статия.',
        activeOnly: 'Само активни членове могат да оценяват тази статия.',
        adminReadOnly: 'Heritage статиите се оценяват от читателите.',
        chooseRating: 'Изберете своята оценка.',
        yourRating: 'Вашата оценка: {rating} / 5',
        loadError: 'Оценките на статията не могат да бъдат заредени.',
        saveError: 'Оценката не можа да бъде запазена.',
    },
    it: {
        title: 'Valuta questo articolo',
        signInToRate: 'per valutare questo articolo.',
        activeOnly: 'Solo i membri attivi possono valutare questo articolo.',
        adminReadOnly: 'Gli articoli Heritage sono valutati dai lettori.',
        chooseRating: 'Scegli la tua valutazione.',
        yourRating: 'La tua valutazione: {rating} / 5',
        loadError: 'Impossibile caricare le valutazioni dell’articolo.',
        saveError: 'Impossibile salvare la valutazione.',
    },
};

function HeritageRating({ articleSlug }) {
    const { language } = useLanguage();
    const text = copy[language] ?? copy.en;
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const { user, isAdmin, isActive } = useAuth();

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
                    setError(text.loadError);
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
    }, [articleSlug, text.loadError, user?.id]);

    const canRate = Boolean(user && isActive && !isAdmin);

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
            setError(text.saveError);
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
                        {text.title}
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
                        ★
                    </button>
                ))}
            </div>

            {!user ? (
                <p className={styles.ratingNote}>
                    <Link to="/login">{t('signIn')}</Link> {text.signInToRate}
                </p>
            ) : isAdmin ? (
                <p className={styles.ratingNote}>
                    {text.adminReadOnly}
                </p>
            ) : !isActive ? (
                <p className={styles.ratingNote}>
                    {text.activeOnly}
                </p>
            ) : (
                <p className={styles.ratingNote}>
                    {ratingInfo.userRating > 0
                        ? format(text.yourRating, { rating: ratingInfo.userRating })
                        : text.chooseRating}
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
