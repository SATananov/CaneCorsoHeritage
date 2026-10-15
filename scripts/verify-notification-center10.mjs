import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/pages/MyFilesPage.jsx', 'utf8');
const styles = readFileSync('src/pages/MyFilesPage.module.css', 'utf8');
const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');

assert.match(bell, /\/my-files#file-\$\{encodeURIComponent\(item\.target_id\)\}/);
assert.match(page, /id=\{`file-\$\{file\.id\}`\}/);
assert.match(page, /window\.location\.hash/);
assert.match(page, /hash\.startsWith\('#file-'\)/);
assert.match(page, /document\.getElementById\(hash\.slice\(1\)\)/);
assert.match(page, /scrollIntoView/);
assert.match(page, /block: 'center'/);
assert.match(styles, /\.card:target/);
assert.match(styles, /scroll-margin-top/);

console.log(
    'PASS: NOTIFICATION CENTER 10 file-rating notification deep-links to and highlights the exact rated file.',
);
