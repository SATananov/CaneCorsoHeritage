import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import StoryCard from './components/StoryCard';
import Footer from './components/Footer';

function App() {
    return (
        <>
            <Header />

            <main>
                <Hero />

                <section className="stories-section" id="stories" aria-labelledby="stories-title">
                    <div className="site-container">
                        <div className="section-heading">
                            <p className="section-kicker">Featured stories</p>
                            <h2 id="stories-title">Every Cane Corso carries a story.</h2>
                            <p className="section-intro">
                                These are temporary sample cards used to practice React components
                                and props. Real data will be connected later in the course.
                            </p>
                        </div>

                        <div className="story-grid">
                            <StoryCard
                                name="Mark I"
                                category="Foundation"
                                title="Where the story begins"
                                description="A first heritage card focused on presence, character and the beginning of a lasting bond."
                                meta="Sample story"
                            />

                            <StoryCard
                                name="Hera"
                                category="Legacy"
                                title="Character that leaves a mark"
                                description="A second reusable card showing how the same React component can display different content through props."
                                meta="Sample story"
                            />

                            <StoryCard
                                name="Reia"
                                category="Loyalty"
                                title="The instinct to return home"
                                description="A third example that keeps the same structure and visual identity while receiving its own data."
                                meta="Sample story"
                            />
                        </div>
                    </div>
                </section>

                <section className="heritage-section" id="heritage" aria-labelledby="heritage-title">
                    <div className="site-container heritage-grid">
                        <div className="heritage-mark" aria-hidden="true">
                            <img src="/images/logo.jpg" alt="" />
                        </div>

                        <div className="heritage-copy">
                            <p className="section-kicker">Unico Suo Genere</p>
                            <h2 id="heritage-title">A modern React project with a heritage identity.</h2>
                            <p>
                                Cane Corso Heritage keeps the black, old-gold and ivory visual
                                language of the original project, while the new application is
                                rebuilt step by step with React and the concepts covered in the course.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

export default App;
