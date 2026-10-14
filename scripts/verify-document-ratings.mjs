import fs from 'node:fs';

const gallery = fs.readFileSync('src/pages/GalleryPage.jsx', 'utf8');
const documents = fs.readFileSync('src/pages/DocumentsPage.jsx', 'utf8');

const fail = (message) => {
    console.error(`FAIL: ${message}`);
    process.exit(1);
};

if (!documents.includes("import MediaRating from '../components/MediaRating';")) {
    fail('DocumentsPage must import MediaRating.');
}

if (!documents.includes('<MediaRating') || !documents.includes('fileId={file.id}') || !documents.includes('ownerId={file.user_id}')) {
    fail('DocumentsPage must render MediaRating for each document file.');
}

if (gallery.includes('mediaType !== MEDIA_FILTERS.DOCUMENTS &&')) {
    fail('Gallery must not suppress MediaRating for document cards.');
}

console.log('PASS: document cards use the existing file rating flow.');
