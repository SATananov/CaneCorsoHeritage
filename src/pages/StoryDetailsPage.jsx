import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaRating from '../components/MediaRating';
import useAuth from '../hooks/useAuth';
import { fetchStoryFiles } from '../services/fileService';
import {
    fetchStoryRatings,
    saveStoryRating,
} from '../services/ratingService';
import { fetchStoryById } from '../services/storyService';
import styles from './DetailsPage.module.css';

const ratingValues = [1, 2, 3, 4, 5];

function StoryDetailsPage() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [story, setStory] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [ratingInfo, setRatingInfo] = useState({
        average: 0,
        count: 0,
        userRating: 0,
    });
    const [ratingSaving, setRatingSaving] = useState(false);
    const [ratingError, setRatingError] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadStory = async () => {
            try {
                const data = await fetchStoryById(storyId, {
                    signal: controller.signal,
                });
                const fileData = await fetchStoryFiles(storyId);
                const ratingData = await fetchStoryRatings(
                    storyId,
                    user?.id,
                    { signal: controller.signal },
                );

                if (active) {
                    setStory(data);
                    setAttachments(fileData);
                    setRatingInfo(ratingData);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError('Unable to load this story right now.');
                }
            }
        };

        loadStory();

        return () => {
            active = false;
            controller.abort();
        };
    }, [storyId, user?.id]);

    const ratingHandler = async (rating) => {
        if (!user || story?.visibility !== 'community') {
            return;
        }

        setRatingSaving(true);
        setRatingError('');

        try {
            await saveStoryRating(
                storyId,
                user.id,
                rating,
                ratingInfo.userRating > 0,
            );

            const nextRatingInfo = await fetchStoryRatings(storyId, user.id);
            setRatingInfo(nextRatingInfo);
        } catch (saveError) {
            setRatingError(saveError.message || 'Unable to save your rating.');
        } finally {
            setRatingSaving(false);
        }
    };

    const isCommunityStory = story?.visibility === 'community';
    const isOwnStory = Boolean(
        user?.id
        && story?.author_id
        && user.id === story.author_id,
    );

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <button
                    className={styles.backButton}
                    type="button"
                    onClick={() => navigate('/stories')}
                >
                    ← Back to Stories
                </button>

                {!story && !error && (
                    <LoadingSpinner label="Loading story details..." />
                )}

                {error && (
                    <div className={styles.message} role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {story && (
                    <article className={styles.article}>
                        <p className={styles.eyebrow}>{story.eyebrow}</p>
                        <h1>{story.title}</h1>
                        <p className={styles.lead}>{story.description}</p>

                        <div className={styles.divider} />

                        <p className={styles.body}>
                            {story.content ?? story.details}
                        </p>

                        {isCommunityStory && (
                            <section
                                className={styles.ratingSection}
                                aria-labelledby="story-rating-title"
                            >
                                <div className={styles.ratingHeading}>
                                    <div>
                                        <p className={styles.ratingKicker}>
                                            Reader rating
                                        </p>
                                        <h2 id="story-rating-title">
                                            Rate this Story
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
                                                        ? 'rating'
                                                        : 'ratings'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <strong>New</strong>
                                                <span>No ratings yet</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className={styles.ratingStars}
                                    aria-label="Story rating"
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
                                            aria-label={`Rate ${value} out of 5`}
                                            aria-pressed={
                                                ratingInfo.userRating === value
                                            }
                                            disabled={!user || ratingSaving || isOwnStory}
                                            onClick={() => ratingHandler(value)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>

                                {isOwnStory ? (
                                    <p className={styles.ratingNote}>
                                        You cannot rate your own Story.
                                    </p>
                                ) : user ? (
                                    <p className={styles.ratingNote}>
                                        {ratingInfo.userRating > 0
                                            ? `Your rating: ${ratingInfo.userRating} / 5. Choose another star to change it.`
                                            : 'Choose from 1 to 5 stars. You can change your rating later.'}
                                    </p>
                                ) : (
                                    <p className={styles.ratingNote}>
                                        <Link to="/login">Sign in</Link> to rate
                                        this Story.
                                    </p>
                                )}

                                {ratingSaving && (
                                    <p
                                        className={styles.ratingStatus}
                                        role="status"
                                    >
                                        Saving rating...
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
                        )}

                        {attachments.length > 0 && (
                            <section
                                className={styles.attachments}
                                aria-labelledby="story-files-title"
                            >
                                <h2 id="story-files-title">Attached files</h2>

                                <div className={styles.attachmentGrid}>
                                    {attachments.map((file) => (
                                        <article
                                            className={styles.attachmentCard}
                                            key={file.id}
                                        >
                                            {file.mime_type?.startsWith(
                                                'image/',
                                            )
                                                && file.url && (
                                                <img
                                                    src={file.url}
                                                    alt=""
                                                />
                                            )}

                                            {file.mime_type === 'video/mp4'
                                                && file.url && (
                                                <video
                                                    controls
                                                    preload="metadata"
                                                >
                                                    <source
                                                        src={file.url}
                                                        type="video/mp4"
                                                    />
                                                </video>
                                            )}

                                            {file.mime_type?.startsWith(
                                                'audio/',
                                            )
                                                && file.url && (
                                                <audio
                                                    controls
                                                    preload="metadata"
                                                    src={file.url}
                                                >
                                                    Your browser does not
                                                    support audio playback.
                                                </audio>
                                            )}

                                            <div>
                                                <strong>
                                                    {file.file_name}
                                                </strong>

                                                {file.url && (
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open file
                                                    </a>
                                                )}

                                                {file.visibility === 'community'
                                                    && (file.mime_type?.startsWith('image/')
                                                        || file.mime_type?.startsWith('audio/')) && (
                                                        <MediaRating
                                                            fileId={file.id}
                                                            ownerId={file.user_id}
                                                        />
                                                    )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {story.author && (
                            <p className={styles.meta}>
                                Story by
                                {story.author_id ? (
                                    <Link to={`/users/${story.author_id}`}>
                                        {story.author}
                                    </Link>
                                ) : (
                                    <strong>{story.author}</strong>
                                )}
                            </p>
                        )}
                    </article>
                )}
            </div>
        </main>
    );
}

export default StoryDetailsPage;
