import { useEffect, useState } from 'react';
import { fetchStoryFiles } from '../services/fileService';
import { fetchStoryRatings } from '../services/ratingService';
import { fetchStoryById } from '../services/storyService';

const EMPTY_RATING_INFO = {
    average: 0,
    count: 0,
    userRating: 0,
};

export function useStoryDetails(storyId, userId, loadErrorMessage) {
    const [story, setStory] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [ratingInfo, setRatingInfo] = useState(EMPTY_RATING_INFO);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadStory = async () => {
            setStory(null);
            setError('');
            setAttachments([]);
            setRatingInfo(EMPTY_RATING_INFO);

            try {
                const data = await fetchStoryById(storyId, {
                    signal: controller.signal,
                });

                if (!active) {
                    return;
                }

                setStory(data);

                const [filesResult, ratingsResult] = await Promise.allSettled([
                    fetchStoryFiles(storyId),
                    fetchStoryRatings(
                        storyId,
                        userId,
                        { signal: controller.signal },
                    ),
                ]);

                if (!active) {
                    return;
                }

                if (filesResult.status === 'fulfilled') {
                    setAttachments(filesResult.value);
                }

                if (ratingsResult.status === 'fulfilled') {
                    setRatingInfo(ratingsResult.value);
                }
            } catch (loadError) {
                if (loadError.name !== 'AbortError' && active) {
                    setError(loadErrorMessage);
                }
            }
        };

        loadStory();

        return () => {
            active = false;
            controller.abort();
        };
    }, [loadErrorMessage, storyId, userId]);

    return {
        story,
        attachments,
        ratingInfo,
        setRatingInfo,
        error,
    };
}

export { EMPTY_RATING_INFO };
