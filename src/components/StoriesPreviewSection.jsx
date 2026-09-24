import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import AddStoryModal from './AddStoryModal';
import LoadingSpinner from './LoadingSpinner';
import PreviewCard from './PreviewCard';
import StoryDeleteModal from './StoryDeleteModal';
import { fetchStories } from '../services/storyService';
import styles from './StoriesPreviewSection.module.css';

const fallbackStories = [
    {
        _id: 'origins-story',
        eyebrow: 'Origins',
        title: 'Where every story begins',
        description: 'A first look at the people, Cane Corso and moments behind the heritage.',
        details: 'Every story starts with a real relationship, a place and a moment worth remembering.',
    },
    {
        _id: 'loyalty-story',
        eyebrow: 'Loyalty',
        title: 'The bond that stays',
        description: 'Stories that show character, trust and the connection built over time.',
        details: 'Trust is built through everyday life, shared experience and responsibility.',
    },
    {
        _id: 'legacy-story',
        eyebrow: 'Legacy',
        title: 'Stories carried forward',
        description: 'A place for memories and experiences that become part of the heritage.',
        details: 'Preserving these memories helps connect personal experience with the wider Cane Corso heritage.',
    },
];

function StoriesPreviewSection() {
    const navigate = useNavigate();
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUsingFallback, setIsUsingFallback] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [storyToDelete, setStoryToDelete] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadStories = async () => {
            try {
                const data = await fetchStories({ signal: controller.signal });
                setStories(data);
                setIsUsingFallback(false);
            } catch (loadError) {
                if (loadError.name !== 'AbortError') {
                    setStories(fallbackStories);
                    setIsUsingFallback(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadStories();

        return () => {
            controller.abort();
        };
    }, []);

    const refreshStoriesAfterMutation = async () => {
        const data = await fetchStories();
        setStories(data);
        setIsUsingFallback(false);
    };

    return (
        <section className="visitor-section" aria-labelledby="stories-feature-title">
            <div className="site-container">
                <div className="visitor-feature-grid visitor-feature-grid-reverse section-feature-intro" id="stories">
                    <div className="visitor-feature-copy">
                        <p className="section-kicker">Stories</p>
                        <h2 id="stories-feature-title">Cane Corso Stories.</h2>
                        <p>
                            Explore stories about character, loyalty and the bond between Cane Corso
                            and people.
                        </p>
                    </div>

                    <div className="visitor-feature-image">
                        <img src="/images/cards/stories-card.webp" alt="Cane Corso stories" />
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Discover the stories.</h2>
                </div>

                {!isLoading && !isUsingFallback && (
                    <div className={styles.createAction}>
                        <button type="button" onClick={() => setIsCreateOpen(true)}>
                            Share a Story
                        </button>
                    </div>
                )}

                <div className="story-preview-grid">
                    {isLoading ? (
                        <LoadingSpinner label="Loading stories..." />
                    ) : (
                        stories.map((story) => (
                            <PreviewCard
                                key={story._id}
                                eyebrow={story.eyebrow}
                                title={story.title}
                                description={story.description}
                                details={story.details}
                                onDetails={
                                    isUsingFallback
                                        ? undefined
                                        : () => navigate(`/stories/${story._id}`)
                                }
                                onDelete={
                                    isUsingFallback
                                        ? undefined
                                        : () => setStoryToDelete(story)
                                }
                            />
                        ))
                    )}
                </div>
            </div>

            {isCreateOpen && (
                <AddStoryModal
                    onClose={() => setIsCreateOpen(false)}
                    onCreated={refreshStoriesAfterMutation}
                />
            )}

            {storyToDelete && (
                <StoryDeleteModal
                    story={storyToDelete}
                    onClose={() => setStoryToDelete(null)}
                    onDeleted={refreshStoriesAfterMutation}
                />
            )}
        </section>
    );
}

export default StoriesPreviewSection;
