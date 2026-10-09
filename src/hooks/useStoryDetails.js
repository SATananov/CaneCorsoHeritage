import { useEffect, useState } from 'react';
import { fetchStoryFiles } from '../services/fileService';
import { fetchStoryById } from '../services/storyService';

export function useStoryDetails(storyId, userId, loadErrorMessage) {
    const [story, setStory] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');
    const [attachmentsError, setAttachmentsError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadStory = async () => {
            setStory(null);
            setError('');
            setAttachments([]);
            setAttachmentsError(false);

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
                } else {
                    setAttachments([]);
                    setAttachmentsError(true);
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
        attachmentsError,
    };
}
