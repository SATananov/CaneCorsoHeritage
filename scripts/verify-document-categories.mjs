import { readFileSync } from 'node:fs';

const fileService = readFileSync('src/services/fileService.js', 'utf8');
const categories = readFileSync('src/utils/fileCategories.js', 'utf8');
const myFiles = readFileSync('src/pages/MyFilesPage.jsx', 'utf8');
const gallery = readFileSync('src/pages/GalleryPage.jsx', 'utf8');
const documents = readFileSync('src/pages/DocumentsPage.jsx', 'utf8');

const checks = [
    [fileService.includes("contentCategory = null"), 'upload service accepts an optional content category'],
    [fileService.includes("contentCategory === 'document' ? 'documents/' : ''"), 'document uploads use a document storage subfolder'],
    [categories.includes("pathParts[1] === 'documents'"), 'document category is derived from persisted storage path'],
    [myFiles.includes("contentCategory: mode === 'documents' ? 'document' : null"), 'My Documents marks its uploads as documents'],
    [myFiles.includes('accept={mode === \'documents\'') && myFiles.includes('image/*,.txt'), 'My Documents accepts document photos'],
    [gallery.includes('if (isDocumentCategoryFile(file)) return MEDIA_FILTERS.DOCUMENTS;'), 'Gallery classifies document photos as documents before MIME media checks'],
    [documents.includes('if (isDocumentCategoryFile(file)) return true;'), 'Documents includes explicitly categorized document photos'],
];

for (const [ok, message] of checks) {
    if (!ok) {
        console.error(`FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`PASS: ${message}`);
}
