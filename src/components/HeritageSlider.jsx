import HeritageSlide from './HeritageSlide';

function HeritageSlider() {
    return (
        <section className="heritage-slider-section" aria-label="Cane Corso Heritage highlights">
            <div className="site-container">
                <div className="heritage-slider-topline">
                    <span>Discover Cane Corso Heritage</span>
                    <span>Automatic gallery · pauses on hover</span>
                </div>

                <div className="heritage-slider">
                    <div className="heritage-slider-track">
                        <HeritageSlide
                            image="/images/slider/stories.png"
                            alt="Cane Corso shown in different parts of everyday life"
                            kicker="Stories"
                            title="Character. Loyalty. Bond."
                            text="Discover Cane Corso through real stories and the people connected with them."
                            href="#stories"
                        />

                        <HeritageSlide
                            image="/images/slider/heritage.png"
                            alt="Cane Corso heritage presented in a global gallery"
                            kicker="Heritage"
                            title="History. Function. Type."
                            text="Enter the historical side of Cane Corso and the heritage behind the breed."
                            href="#heritage"
                        />

                        <HeritageSlide
                            image="/images/slider/knowledge.png"
                            alt="Educational Cane Corso visual guides"
                            kicker="Knowledge"
                            title="Learn. Understand. Preserve."
                            text="A visual knowledge space for responsible care, understanding and preservation."
                            href="#heritage"
                        />

                        <HeritageSlide
                            image="/images/slider/community.png"
                            alt="Cane Corso connected with people and community"
                            kicker="Community"
                            title="People connected by Cane Corso."
                            text="A place for owners, stories, knowledge and shared respect for Cane Corso."
                            href="#stories"
                        />

                        <HeritageSlide
                            image="/images/slider/usg-global.png"
                            alt="Unico Suo Genere global Cane Corso ecosystem"
                            kicker="Unico Suo Genere"
                            title="One identity. One heritage."
                            text="Cane Corso Heritage carries the visual language of the larger USG platform."
                            href="#about"
                        />

                        <HeritageSlide
                            image="/images/slider/stories.png"
                            alt=""
                            kicker="Stories"
                            title="Character. Loyalty. Bond."
                            text="Discover Cane Corso through real stories and the people connected with them."
                            clone={true}
                        />
                    </div>
                </div>

                <p className="heritage-slider-hint">
                    Each image changes automatically. Move the pointer over the banner to pause it.
                </p>
            </div>
        </section>
    );
}

export default HeritageSlider;
