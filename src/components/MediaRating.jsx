import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../hooks/useAuth';
import {
    fetchFileRatings,
    saveFileRating,
} from '../services/fileRatingService';
import styles from './MediaRating.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function MediaRating({ fileId, ownerId }) {
    const { user } = useAuth();
    const [ratingInfo, setRatingInfo] = useState({
        average: 0,
        count: 0,
        userRating: 0,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isOwnFile = Boolean(
        user?.id
        && ownerId
        && user.id === ownerId,
    );

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadRatings = async () => {
            try {
                const data = await fetchFileRatings(
                    fileId,
                    user?.id,
                    { signal: controller.signal },
                );

                if (active) {
                    setRatingInfo(data);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError('Unable to load ratings.');
                }
            }
        };

        loadRatings();

        return () => {
            active = false;
            controller.abort();
        };
    }, [fileId, user?.id]);

    const ratingHandler = async (rating) => {
        if (!user || isOwnFile) {
            return;
        }

        setSaving(true);
        setError('');

        try {
            await saveFileRating(
                fileId,
                user.id,
                rating,
                ratingInfo.userRating > 0,
            );

            const nextInfo = await fetchFileRatings(fileId, user.id);
            setRatingInfo(nextInfo);
        } catch (saveError) {
            setError(saveError.message || 'Unable to save your rating.');
        } finally {
            setSaving(false);
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
                            {ratingInfo.count === 1 ? 'rating' : 'ratings'}
                        </span>
                    </>
                ) : (
                    <>
                        <strong>New</strong>
                        <span>No ratings yet</span>
                    </>
                )}
            </div>

            <div className={styles.stars} aria-label="File rating">
                {ratingValues.map((value) => (
                    <button
                        className={
                            value <= ratingInfo.userRating
                                ? `${styles.star} ${styles.starActive}`
                                : styles.star
                        }
                        key={value}
                        type="button"
                        aria-label={`Rate ${value} out of 5`}
                        aria-pressed={ratingInfo.userRating === value}
                        disabled={!user || saving || isOwnFile}
                        onClick={() => ratingHandler(value)}
                    >
                        ★
                    </button>
                ))}
            </div>

            {isOwnFile ? (
                <span className={styles.note}>
                    You cannot rate your own file.
                </span>
            ) : user ? (
                <span className={styles.note}>
                    {ratingInfo.userRating > 0
                        ? `Your rating: ${ratingInfo.userRating} / 5`
                        : 'Rate this file'}
                </span>
            ) : (
                <span className={styles.note}>
                    <Link to="/login">Sign in</Link> to rate
                </span>
            )}

            {saving && <span className={styles.status}>Saving...</span>}
            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
}

export default MediaRating;
