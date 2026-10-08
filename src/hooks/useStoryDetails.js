import { useEffect, useState } from 'react';
import { fetchStoryFiles } from '../services/fileService';
import { fetchStoryById } from '../services/storyService';

export function useStoryDetails(storyId, userId, loadErrorMessage) {
    const [story, setStory] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadStory = async () => {
            setStory(null);
            setError('');
            setAttachments([]);

            try {
                const data = await fetchStoryById(storyId, {
                    signal: controller.signal,
                });

                if (!active) {
                    return;
                }

                setStory(data);

                const [filesResult] = await Promise.allSettled([
                    fetchStoryFiles(storyId),
                ]);

                if (!active) {
                    return;
                }

                if (filesResult.status === 'fulfilled') {
                    setAttachments(filesResult.value);
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
        error,
    };
}
