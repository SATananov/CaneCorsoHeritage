import EntranceCard from './EntranceCard';

function PathsSection() {
    return (
        <section className="paths-section" id="paths" aria-labelledby="paths-title">
            <div className="site-container">
                <div className="section-heading">
                    <p className="section-kicker">Explore Cane Corso Heritage</p>
                    <h2 id="paths-title">Choose where you want to begin.</h2>
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
    );
}

export default PathsSection;
