import MediaRating from '../MediaRating';
import styles from '../../pages/DetailsPage.module.css';

function StoryAttachments({ attachments, t }) {
    if (!attachments.length) {
        return null;
    }

    return (
        <section
            className={styles.attachments}
            aria-labelledby="story-files-title"
        >
            <h2 id="story-files-title">{t('attachedFiles')}</h2>

            <div className={styles.attachmentGrid}>
                {attachments.map((file) => (
                    <article
                        className={styles.attachmentCard}
                        key={file.id}
                    >
                        {file.mime_type?.startsWith('image/')
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

                        {file.mime_type?.startsWith('audio/')
                            && file.url && (
                            <audio
                                controls
                                preload="metadata"
                                src={file.url}
                            >
                                {t('audioUnsupported')}
                            </audio>
                        )}

                        <div>
                            <strong>{file.file_name}</strong>

                            {file.url && (
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t('openFile')}
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
    );
}

export default StoryAttachments;
