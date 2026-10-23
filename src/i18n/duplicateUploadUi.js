const duplicateUploadCopy = {
    en: {
        title: 'Duplicate file',
        body: 'This exact file already exists as "{existing}". Upload "{incoming}" again anyway?',
    },
    bg: {
        title: 'Дублиран файл',
        body: 'Този файл вече съществува като „{existing}“. Да качим „{incoming}“ отново въпреки това?',
    },
    it: {
        title: 'File duplicato',
        body: 'Questo file esiste già come "{existing}". Vuoi caricare di nuovo "{incoming}" comunque?',
    },
};

export function getDuplicateUploadMessage(language, incoming, existing) {
    const selected = duplicateUploadCopy[language] ?? duplicateUploadCopy.en;

    return `${selected.title}\n\n${selected.body
        .replace('{incoming}', incoming || '')
        .replace('{existing}', existing || incoming || '')}`;
}
