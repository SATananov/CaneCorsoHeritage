import { useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './languageContext';

const SUPPORTED_LANGUAGES = ['en', 'bg', 'it'];
const STORAGE_KEY = 'cane-corso-heritage-language';

function resolveInitialLanguage() {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (SUPPORTED_LANGUAGES.includes(stored)) {
        return stored;
    }

    const browserLanguage = (navigator.language || 'en')
        .slice(0, 2)
        .toLowerCase();

    return SUPPORTED_LANGUAGES.includes(browserLanguage)
        ? browserLanguage
        : 'en';
}

function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(resolveInitialLanguage);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
    }), [language]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export default LanguageProvider;
