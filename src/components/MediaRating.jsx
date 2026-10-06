import { useCallback, useEffect, useState } from 'react';
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
    const { language } = useLanguage();
    const t = useCallback((key) => getTranslation(language, 'mediaRating', key), [language]);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
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
                    setError(t('loadError'));
                }
            }
        };

        loadRatings();

        return () => {
            active = false;
            controller.abort();
        };
    }, [fileId, user?.id, t]);

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
        } catch {
            setError(t('saveError'));
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
                        disabled={!user || saving || isOwnFile}
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
            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
}

export default MediaRating;
