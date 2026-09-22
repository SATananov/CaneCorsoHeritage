import { useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import HeritageSlider from './components/HeritageSlider';
import Hero from './components/Hero';
import PathsSection from './components/PathsSection';
import StoriesPreviewSection from './components/StoriesPreviewSection';
import HeritagePreviewSection from './components/HeritagePreviewSection';
import AboutUsgSection from './components/AboutUsgSection';
import HelpSection from './components/HelpSection';
import Footer from './components/Footer';

function App() {
    useEffect(() => {
        const previousTitle = document.title;

        document.title = 'Cane Corso Heritage';

        return () => {
            document.title = previousTitle;
        };
    }, []);

    return (
        <>
            <Header />

            <main>
                <HeritageSlider />
                <Hero />
                <PathsSection />
                <StoriesPreviewSection />
                <HeritagePreviewSection />
                <AboutUsgSection />
                <HelpSection />
            </main>

            <Footer />
        </>
    );
}

export default App;
