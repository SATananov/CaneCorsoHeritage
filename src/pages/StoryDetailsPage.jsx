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
import styles from './DetailsPage.module.css';

function StoryDetailsPage() {
    const { language } = useLanguage();
    const t = (key) => getTranslation(language, 'storyDetails', key);
    const tm = (key) => getTranslation(language, 'memberProfile', key);
    const ts = (key) => getTranslation(language, 'publicStories', key);
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const {
        story,
        attachments,
        error,
        attachmentsError,
    } = useStoryDetails(storyId, user?.id, t('loadError'));

    const {
        visibleStory,
        status: translationStatus,
        shouldTranslate,
        showOriginal,
        setShowOriginal,
    } = useStoryTranslation({ story, language, user });

    const displayEyebrow = (currentStory) => {
        if (currentStory?.editorial_source) {
            const editorialEyebrows = {
                Origins: ts('fallbackOrigins'),
                Loyalty: ts('fallbackLoyalty'),
                Legacy: ts('fallbackLegacy'),
            };

            return editorialEyebrows[currentStory.eyebrow] ?? currentStory.eyebrow;
        }

        return currentStory?.eyebrow === 'Community'
            ? tm('communityEyebrow')
            : currentStory?.eyebrow === 'My Own'
                ? tm('privateEyebrow')
                : currentStory?.eyebrow;
    };

    const isCommunityStory = story?.visibility === 'community';
    const isEditorialStory = Boolean(story?.editorial_source);
    const showCommunityInteractions = isCommunityStory && !isEditorialStory;
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
                            eyebrowLabel={displayEyebrow(story)}
                        />

                        {showCommunityInteractions && (
                            <StoryRating
                                storyId={storyId}
                                user={user}
                                isOwnStory={isOwnStory}
                            />
                        )}

                        {attachmentsError && (
                            <div className={styles.message} role="alert">
                                <p>{t('attachmentsLoadError')}</p>
                            </div>
                        )}

                        <StoryAttachments
                            attachments={attachments}
                            t={t}
                        />

                        {showCommunityInteractions && (
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
