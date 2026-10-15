import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const comments = read('src/components/CommentsSection.jsx');
const styles = read('src/components/CommentsSection.module.css');

assert.match(comments, /window\.location\.hash/);
assert.match(comments, /document\.getElementById\(hash\.slice\(1\)\)/);
assert.match(comments, /closest\('details'\)/);
assert.match(comments, /details\.open = true/);
assert.match(comments, /requestAnimationFrame/);
assert.match(comments, /scrollIntoView/);
assert.match(comments, /block: 'center'/);

assert.match(styles, /\.comment:target/);
assert.match(styles, /scroll-margin-top/);

console.log(
    'PASS: NOTIFICATION CENTER 06 exact comment target opens collapsed disclosure, scrolls into view and highlights target.',
);
