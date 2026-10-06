import { Link } from 'react-router';
import styles from '../../pages/DetailsPage.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function StoryRating({
    ratingInfo,
    ratingSaving,
    ratingError,
    user,
    isOwnStory,
    onRate,
    t,
    format,
}) {
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
                        disabled={!user || ratingSaving || isOwnStory}
                        onClick={() => onRate(value)}
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

            {ratingSaving && (
                <p
                    className={styles.ratingStatus}
                    role="status"
                >
                    {t('saving')}
                </p>
            )}

            {ratingError && (
                <p
                    className={styles.ratingError}
                    role="alert"
                >
                    {ratingError}
                </p>
            )}
        </section>
    );
}

export default StoryRating;
