import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchStoryFiles } from '../services/fileService';
import { fetchStoryById } from '../services/storyService';
import styles from './DetailsPage.module.css';

function StoryDetailsPage() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const [story, setStory] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadStory = async () => {
            try {
                const data = await fetchStoryById(storyId, { signal: controller.signal });
                const fileData = await fetchStoryFiles(storyId);

                if (active) {
                    setStory(data);
                    setAttachments(fileData);
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
    }, [storyId]);

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/stories')}>
                    ← Back to Stories
                </button>

                {!story && !error && <LoadingSpinner label="Loading story details..." />}

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
                        <p className={styles.body}>{story.content ?? story.details}</p>

                        {attachments.length > 0 && (
                            <section className={styles.attachments} aria-labelledby="story-files-title">
                                <h2 id="story-files-title">Attached files</h2>

                                <div className={styles.attachmentGrid}>
                                    {attachments.map((file) => (
                                        <article className={styles.attachmentCard} key={file.id}>
                                            {file.mime_type?.startsWith('image/') && file.url && (
                                                <img src={file.url} alt="" />
                                            )}

                                            {file.mime_type === 'video/mp4' && file.url && (
                                                <video controls preload="metadata">
                                                    <source src={file.url} type="video/mp4" />
                                                </video>
                                            )}

                                            <div>
                                                <strong>{file.file_name}</strong>
                                                {file.url && (
                                                    <a href={file.url} target="_blank" rel="noreferrer">
                                                        Open file
                                                    </a>
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
                                    <Link to={`/users/${story.author_id}`}>{story.author}</Link>
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
