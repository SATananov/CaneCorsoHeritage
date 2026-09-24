import { useParams } from 'react-router';
import HelpSection from '../components/HelpSection';

const helpTopics = {
    explore: {
        title: 'Explore the project',
        text: 'Use the main navigation and the dedicated routes for Stories, Heritage and About USG.',
    },
    read: {
        title: 'Open full details',
        text: 'Story and Heritage details now have their own URLs, so they can be opened directly and shared.',
    },
    share: {
        title: 'Share a story',
        text: 'Story creation remains available from Stories. Member ownership will be connected when Supabase authentication is added.',
    },
};

function HelpPage() {
    const { topic } = useParams();
    const selectedTopic = topic ? helpTopics[topic] : null;

    return (
        <main className="route-page">
            {topic && (
                <section className="route-topic-banner" aria-live="polite">
                    <div className="site-container">
                        <p className="section-kicker">Help topic</p>
                        <h1>{selectedTopic?.title ?? 'Help topic not found'}</h1>
                        <p>
                            {selectedTopic?.text
                                ?? 'Choose Explore, Read or Share below to open a supported help topic.'}
                        </p>
                    </div>
                </section>
            )}
            <HelpSection />
        </main>
    );
}

export default HelpPage;
