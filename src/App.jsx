import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import EntranceCard from './components/EntranceCard';
import Footer from './components/Footer';

function App() {
    return (
        <>
            <Header />

            <main>
                <Hero />

                <section className="paths-section" id="paths" aria-labelledby="paths-title">
                    <div className="site-container">
                        <div className="section-heading">
                            <p className="section-kicker">Explore Cane Corso Heritage</p>
                            <h2 id="paths-title">Choose where you want to begin.</h2>
                            <p>
                                For now these sections are part of the same page. When routing is
                                covered in the course, they can become separate pages.
                            </p>
                        </div>

                        <div className="entrance-grid">
                            <EntranceCard
                                sectionId="stories"
                                eyebrow="Stories"
                                title="Cane Corso Stories"
                                description="A place for personal stories, remarkable Cane Corso and the people connected with them."
                                note="Stories section"
                            />

                            <EntranceCard
                                sectionId="heritage"
                                eyebrow="Heritage"
                                title="History and Heritage"
                                description="A focused section for the history, character and heritage of Cane Corso."
                                note="Heritage section"
                            />

                            <EntranceCard
                                sectionId="about"
                                eyebrow="About"
                                title="About the Project"
                                description="Cane Corso Heritage is my ReactJS course project, built step by step with the lectures and exercises."
                                note="Project section"
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

export default App;
