const partialSaveErrors = {
    en: 'The Story was saved, but its attachments did not finish processing. Review the remaining files and try again.',
    bg: 'Историята е запазена, но обработката на прикачените файлове не завърши. Прегледайте оставащите файлове и опитайте отново.',
    it: 'La Storia è stata salvata, ma l’elaborazione degli allegati non è stata completata. Controlla i file rimanenti e riprova.',
};

const completionRefreshErrors = {
    en: 'The Story was saved, but the Stories list could not be refreshed. Try again to finish the refresh without creating another Story.',
    bg: 'Историята е запазена, но списъкът с Истории не можа да бъде обновен. Опитайте отново, за да завършите обновяването, без да създавате нова История.',
    it: 'La Storia è stata salvata, ma l’elenco delle Storie non è stato aggiornato. Riprova per completare l’aggiornamento senza creare un’altra Storia.',
};

export function getStoryPartialSaveError(language) {
    return partialSaveErrors[language] ?? partialSaveErrors.en;
}

export function getStoryCompletionRefreshError(language) {
    return completionRefreshErrors[language] ?? completionRefreshErrors.en;
}
