import { useEffect, useState } from 'react';
import PreviewCard from './PreviewCard';
import { getHeritagePreview } from '../services/heritageService';

function HeritagePreviewSection() {
    const [heritageData, setHeritageData] = useState(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isActive = true;

        const loadHeritageData = async () => {
            try {
                const data = await getHeritagePreview();

                if (isActive) {
                    setHeritageData(data);
                }
            } catch {
                if (isActive) {
                    setHasError(true);
                }
            }
        };

        loadHeritageData();

        return () => {
            isActive = false;
        };
    }, []);

    let heritageIntro = <p>Loading heritage preview...</p>;

    if (hasError) {
        heritageIntro = <p>Heritage preview is temporarily unavailable.</p>;
    } else if (heritageData) {
        heritageIntro = (
            <>
                <p className="section-kicker">{heritageData.eyebrow}</p>
                <h2 id="heritage-preview-title">{heritageData.title}</h2>
                <p>{heritageData.summary}</p>
            </>
        );
    }

    return (
        <section
            className="visitor-section visitor-section-alt"
            aria-labelledby="heritage-preview-title"
        >
            <div className="site-container">
                <div className="visitor-feature-grid section-feature-intro" id="heritage">
                    <div className="visitor-feature-image">
                        <img src="/images/cards/heritage-card.webp" alt="Cane Corso heritage" />
                    </div>

                    <div className="visitor-feature-copy" aria-live="polite">
                        {heritageIntro}
                    </div>
                </div>

                <div className="visitor-section-heading visitor-section-heading-compact">
                    <h2>Explore the heritage.</h2>
                </div>

                <div className="story-preview-grid">
                    <PreviewCard
                        eyebrow="Origins"
                        title="Roots and history"
                        description="Discover the historical background and the path that shaped Cane Corso heritage."
                        details="Historical context helps explain how the Cane Corso developed alongside people and their needs."
                    />

                    <PreviewCard
                        eyebrow="Function"
                        title="Built for purpose"
                        description="Explore the original working function and the role that shaped the Cane Corso."
                        details="Working purpose influenced character, structure and the qualities expected from the Cane Corso."
                    />

                    <PreviewCard
                        eyebrow="Type"
                        title="Function shapes type"
                        description="See how function, structure and identity connect through the heritage of Cane Corso."
                        details="Understanding type means looking beyond appearance and considering the function behind the form."
                    />
                </div>
            </div>
        </section>
    );
}

export default HeritagePreviewSection;
