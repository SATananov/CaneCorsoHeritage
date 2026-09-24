import AboutUsgSection from '../components/AboutUsgSection';
import HelpSection from '../components/HelpSection';
import HeritagePreviewSection from '../components/HeritagePreviewSection';
import HeritageSlider from '../components/HeritageSlider';
import Hero from '../components/Hero';
import PathsSection from '../components/PathsSection';
import StoriesPreviewSection from '../components/StoriesPreviewSection';

function HomePage() {
    return (
        <main>
            <HeritageSlider />
            <Hero />
            <PathsSection />
            <StoriesPreviewSection />
            <HeritagePreviewSection />
            <AboutUsgSection />
            <HelpSection />
        </main>
    );
}

export default HomePage;
