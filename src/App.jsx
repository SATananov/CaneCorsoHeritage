import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import HeritageSlider from './components/HeritageSlider';
import PathsSection from './components/PathsSection';
import Footer from './components/Footer';

function App() {
    return (
        <>
            <Header />

            <main>
                <HeritageSlider />
                <Hero />
                <PathsSection />
            </main>

            <Footer />
        </>
    );
}

export default App;
