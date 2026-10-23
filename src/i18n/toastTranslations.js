export const toastTranslations = {
    en: {
        close: 'Close notification',
        notifications: 'Notifications',
        storySave: {
            loadingTitle: 'Saving Story',
            loadingMessage: 'Please wait while your Story is being saved.',
            slowMessage: 'This is taking a little longer than usual. Your work is still being processed.',
            successTitle: 'Story saved',
            successMessage: 'Your Story changes were saved successfully.',
            errorTitle: 'Story could not be completed',
            errorMessage: 'Your Story could not be completed. Review the message in the form and try again.',
        },
        storyPartial: {
            errorTitle: 'Story saved with an incomplete step',
            errorMessage: 'The Story was saved, but an attachment or visibility step did not finish. Review the form message and retry.',
        },
        storyRefresh: {
            errorTitle: 'Story saved, refresh incomplete',
            errorMessage: 'The Story was saved, but the latest Story list could not be refreshed. Your saved content is preserved.',
        },
        filesUpload: {
            loadingTitle: 'Uploading files',
            loadingMessage: 'Please wait while your files are being uploaded.',
            slowMessage: 'The upload is taking longer than usual. Please keep this page open.',
            successTitle: 'Files uploaded',
            successMessage: 'Your files were uploaded successfully.',
            errorTitle: 'Upload not completed',
            errorMessage: 'The upload could not be completed. Check the message on the page and try again.',
        },
        filesLoad: {
            loadingTitle: 'Loading your files',
            loadingMessage: 'Please wait while your private collection is being loaded.',
            slowMessage: 'Loading is taking longer than usual. We are still waiting for the latest data.',
            successTitle: 'Files loaded',
            successMessage: 'Your files are ready.',
            errorTitle: 'Files could not be loaded',
            errorMessage: 'The latest file list could not be loaded. Please try again.',
        },
    },
    bg: {
        close: 'Затвори известието',
        notifications: 'Известия',
        storySave: {
            loadingTitle: 'Запазване на историята',
            loadingMessage: 'Моля, изчакайте, докато историята се запазва.',
            slowMessage: 'Операцията отнема повече време от обичайното. Обработката продължава.',
            successTitle: 'Историята е запазена',
            successMessage: 'Промените по историята бяха запазени успешно.',
            errorTitle: 'Историята не беше завършена',
            errorMessage: 'Операцията не можа да завърши. Проверете съобщението във формата и опитайте отново.',
        },
        storyPartial: {
            errorTitle: 'Историята е запазена с незавършена стъпка',
            errorMessage: 'Историята е запазена, но стъпка за файл или видимост не завърши. Проверете съобщението във формата и опитайте отново.',
        },
        storyRefresh: {
            errorTitle: 'Историята е запазена, но обновяването не завърши',
            errorMessage: 'Историята е запазена, но актуалният списък не можа да се презареди. Запазеното съдържание е съхранено.',
        },
        filesUpload: {
            loadingTitle: 'Качване на файловете',
            loadingMessage: 'Моля, изчакайте, докато файловете се качват.',
            slowMessage: 'Качването отнема повече време от обичайното. Оставете страницата отворена.',
            successTitle: 'Файловете са качени',
            successMessage: 'Файловете бяха качени успешно.',
            errorTitle: 'Качването не беше завършено',
            errorMessage: 'Файловете не можаха да бъдат качени. Проверете съобщението на страницата и опитайте отново.',
        },
        filesLoad: {
            loadingTitle: 'Зареждане на файловете',
            loadingMessage: 'Моля, изчакайте, докато личната колекция се зарежда.',
            slowMessage: 'Зареждането отнема повече време от обичайното. Все още изчакваме актуалните данни.',
            successTitle: 'Файловете са заредени',
            successMessage: 'Файловете са готови.',
            errorTitle: 'Файловете не се заредиха',
            errorMessage: 'Актуалният списък с файлове не можа да се зареди. Опитайте отново.',
        },
    },
    it: {
        close: 'Chiudi la notifica',
        notifications: 'Notifiche',
        storySave: {
            loadingTitle: 'Salvataggio della Storia',
            loadingMessage: 'Attendi mentre la tua Storia viene salvata.',
            slowMessage: 'L’operazione sta richiedendo più tempo del solito. L’elaborazione è ancora in corso.',
            successTitle: 'Storia salvata',
            successMessage: 'Le modifiche alla Storia sono state salvate correttamente.',
            errorTitle: 'Impossibile completare la Storia',
            errorMessage: 'L’operazione non è stata completata. Controlla il messaggio nel modulo e riprova.',
        },
        storyPartial: {
            errorTitle: 'Storia salvata con un passaggio incompleto',
            errorMessage: 'La Storia è stata salvata, ma un passaggio relativo agli allegati o alla visibilità non è terminato. Controlla il messaggio nel modulo e riprova.',
        },
        storyRefresh: {
            errorTitle: 'Storia salvata, aggiornamento incompleto',
            errorMessage: 'La Storia è stata salvata, ma l’elenco aggiornato non è stato ricaricato. Il contenuto salvato è conservato.',
        },
        filesUpload: {
            loadingTitle: 'Caricamento dei file',
            loadingMessage: 'Attendi mentre i file vengono caricati.',
            slowMessage: 'Il caricamento sta richiedendo più tempo del solito. Mantieni aperta questa pagina.',
            successTitle: 'File caricati',
            successMessage: 'I file sono stati caricati correttamente.',
            errorTitle: 'Caricamento non completato',
            errorMessage: 'Il caricamento non è stato completato. Controlla il messaggio nella pagina e riprova.',
        },
        filesLoad: {
            loadingTitle: 'Caricamento dei tuoi file',
            loadingMessage: 'Attendi mentre viene caricata la tua raccolta privata.',
            slowMessage: 'Il caricamento sta richiedendo più tempo del solito. Stiamo ancora attendendo i dati aggiornati.',
            successTitle: 'File caricati',
            successMessage: 'I tuoi file sono pronti.',
            errorTitle: 'Impossibile caricare i file',
            errorMessage: 'L’elenco aggiornato dei file non è stato caricato. Riprova.',
        },
    },
};

export function getToastTranslation(language, key) {
    const dictionary = toastTranslations[language] ?? toastTranslations.en;
    return dictionary[key] ?? toastTranslations.en[key] ?? null;
}
