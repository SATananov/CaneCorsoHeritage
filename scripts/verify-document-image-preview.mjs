import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gallery = fs.readFileSync(path.join(root, 'src/pages/GalleryPage.jsx'), 'utf8');
const documents = fs.readFileSync(path.join(root, 'src/pages/DocumentsPage.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/DocumentsPage.module.css'), 'utf8');

const checks = [
  ['Gallery previews document-category image files', gallery.includes('mediaType === MEDIA_FILTERS.IMAGES || isImageDocument(file)')],
  ['Gallery keeps document-category detection', gallery.includes('isDocumentCategoryFile(file)')],
  ['Documents renders image document preview', documents.includes('className={styles.imageDocumentPreview}')],
  ['Documents image preview uses file URL', documents.includes('src={file.url}') && documents.includes('href={file.url}')],
  ['Documents image preview styling exists', css.includes('.imageDocumentPreview') && css.includes('.imageDocumentLink')],
];

for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (!process.exitCode) console.log('PASS: document image previews');
