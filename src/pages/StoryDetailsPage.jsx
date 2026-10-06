import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import CommentsSection from '../components/CommentsSection';
import StoryHeader from '../components/story/StoryHeader';
import StoryRating from '../components/story/StoryRating';
import StoryAttachments from '../components/story/StoryAttachments';
import { useStoryDetails } from '../hooks/useStoryDetails';
import { useStoryTranslation } from '../hooks/useStoryTranslation';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import useAuth from '../hooks/useAuth';
import {
    fetchStoryRatings,
    saveStoryRating,
} from '../services/ratingService';
import styles from './DetailsPage.module.css';

function StoryDetailsPage() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const tm = (key) => getTranslation(language, 'memberProfile', key);
    const format = (key, values) => Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, value),
        t(key),
    );
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const {
        story,
        attachments,
        ratingInfo,
        setRatingInfo,
        error,
    } = useStoryDetails(storyId, user?.id, t('loadError'));

    const {
        visibleStory,
        status: translationStatus,
        shouldTranslate,
        showOriginal,
        setShowOriginal,
    } = useStoryTranslation({ story, language, user });

    const [ratingSaving, setRatingSaving] = useState(false);
    const [ratingError, setRatingError] = useState('');

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
        } catch {
            setRatingError(t('saveRatingError'));
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
                    {t('back')}
                </button>

                {!story && !error && (
                    <LoadingSpinner label={t('loading')} />
                )}

                {error && (
                    <div className={styles.message} role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {story && (
                    <article className={styles.article}>
                        {shouldTranslate && (
                            <div className={styles.translationNotice}>
                                <div>
                                    <strong>{t('translationLabel')}</strong>
                                    <span>
                                        {translationStatus === 'loading' || translationStatus === 'translating'
                                            ? t('translating')
                                            : translationStatus === 'ready'
                                                ? t('translationReady')
                                                : translationStatus === 'signin'
                                                    ? t('translationSignIn')
                                                    : t('translationUnavailable')}
                                    </span>
                                </div>

                                {translationStatus === 'ready' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowOriginal((current) => !current)}
                                    >
                                        {showOriginal ? t('showTranslation') : t('showOriginal')}
                                    </button>
                                )}
                            </div>
                        )}

                        <StoryHeader
                            story={visibleStory}
                            storyByLabel={t('storyBy')}
                            eyebrowLabel={story.eyebrow === 'Community'
                                ? tm('communityEyebrow')
                                : story.eyebrow === 'My Own'
                                    ? tm('privateEyebrow')
                                    : story.eyebrow}
                        />

                        {isCommunityStory && (
                            <StoryRating
                                ratingInfo={ratingInfo}
                                ratingSaving={ratingSaving}
                                ratingError={ratingError}
                                user={user}
                                isOwnStory={isOwnStory}
                                onRate={ratingHandler}
                                t={t}
                                format={format}
                            />
                        )}

                        <StoryAttachments
                            attachments={attachments}
                            t={t}
                        />

                        {isCommunityStory && (
                            <CommentsSection
                                targetType="story"
                                targetId={storyId}
                            />
                        )}
                    </article>
                )}
            </div>
        </main>
    );
}

export default StoryDetailsPage;
