import { useLanguage } from '../context/languageContext';

const languageLabels = {
    en: 'EN',
    bg: 'BG',
    it: 'IT',
};

function LanguageSwitcher() {
    const {
        language,
        setLanguage,
        supportedLanguages,
    } = useLanguage();

    return (
        <div className="language-switcher" aria-label="Language selection">
            {supportedLanguages.map((code) => (
                <button
                    key={code}
                    className={language === code ? 'language-button language-button-active' : 'language-button'}
                    type="button"
                    aria-pressed={language === code}
                    onClick={() => setLanguage(code)}
                >
                    {languageLabels[code]}
                </button>
            ))}
        </div>
    );
}

export default LanguageSwitcher;
