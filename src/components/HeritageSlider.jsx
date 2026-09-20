import HeritageSlide from './HeritageSlide';

const crestImage = '/images/slider/usg-crest-trim.png';

function HeritageSlider() {
    return (
        <section className="heritage-slider-section" aria-label="Cane Corso Heritage highlights">
            <div className="site-container">
                <div className="heritage-slider-topline">
                    <span>Discover Cane Corso Heritage</span>
                </div>

                <div className="heritage-slider">
                    <div className="heritage-slider-track">
                        <HeritageSlide
                            image="/images/slider/stories.png"
                            sideImage={crestImage}
                            kicker="Stories"
                            title="Character. Loyalty. Bond."
                            href="#stories"
                        />

                        <HeritageSlide
                            image="/images/slider/heritage.png"
                            sideImage={crestImage}
                            kicker="Heritage"
                            title="History. Function. Type."
                            href="#heritage"
                        />

                        <HeritageSlide
                            image="/images/slider/knowledge.png"
                            sideImage={crestImage}
                            kicker="Knowledge"
                            title="Learn. Understand. Preserve."
                            href="#heritage"
                        />

                        <HeritageSlide
                            image="/images/slider/community.png"
                            sideImage={crestImage}
                            kicker="Community"
                            title="People connected by Cane Corso."
                            href="#stories"
                        />

                        <HeritageSlide
                            image="/images/slider/usg-global.png"
                            sideImage={crestImage}
                            kicker="Unico Suo Genere"
                            title="One identity. One heritage."
                            href="#about"
                        />

                        <HeritageSlide
                            image="/images/slider/stories.png"
                            sideImage={crestImage}
                            kicker="Stories"
                            title="Character. Loyalty. Bond."
                            clone={true}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeritageSlider;


