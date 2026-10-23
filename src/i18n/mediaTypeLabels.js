const mediaTypeLabels = {
    en: {
        image: 'IMAGE',
        video: 'VIDEO',
        audio: 'AUDIO',
        story: 'STORY',
        document: 'DOCUMENT',
    },
    bg: {
        image: 'СНИМКА',
        video: 'ВИДЕО',
        audio: 'АУДИО',
        story: 'ИСТОРИЯ',
        document: 'ДОКУМЕНТ',
    },
    it: {
        image: 'IMMAGINE',
        video: 'VIDEO',
        audio: 'AUDIO',
        story: 'STORIA',
        document: 'DOCUMENTO',
    },
};

export function getMediaTypeLabel(language, type) {
    return mediaTypeLabels[language]?.[type]
        ?? mediaTypeLabels.en[type]
        ?? type.toUpperCase();
}