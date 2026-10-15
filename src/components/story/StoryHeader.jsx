import { Link } from 'react-router';
import styles from '../../pages/DetailsPage.module.css';

function StoryHeader({ story, storyByLabel, eyebrowLabel }) {
    const displayAuthor = story.author || story.editorial_source;

    return (
        <>
            <p className={styles.eyebrow}>{eyebrowLabel ?? story.eyebrow}</p>
            <h1>{story.title}</h1>
            <p className={styles.lead}>{story.description}</p>

            {displayAuthor && (
                <p className={styles.meta}>
                    {storyByLabel}
                    {story.author && story.author_id ? (
                        <Link to={`/users/${story.author_id}`}>
                            {story.author}
                        </Link>
                    ) : (
                        <strong>{displayAuthor}</strong>
                    )}
                </p>
            )}

            <div className={styles.divider} />
            <p className={styles.body}>
                {story.content ?? story.details}
            </p>
        </>
    );
}

export default StoryHeader;
