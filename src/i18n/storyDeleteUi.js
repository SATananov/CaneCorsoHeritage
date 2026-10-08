const cleanupWarnings = {
    en: 'The Story was deleted, but some stored files could not be cleaned up.',
    bg: 'Историята е изтрита, но част от съхранените файлове не можаха да бъдат почистени.',
    it: 'La Storia è stata eliminata, ma alcuni file archiviati non sono stati rimossi.',
};

export function getStoryDeleteCleanupWarning(language) {
    return cleanupWarnings[language] ?? cleanupWarnings.en;
}
