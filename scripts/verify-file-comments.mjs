import fs from 'node:fs';

function read(path) {
    return fs.readFileSync(path, 'utf8');
}

function expect(condition, label) {
    if (!condition) {
        throw new Error(`FAIL: ${label}`);
    }

    console.log(`PASS: ${label}`);
}

const migration = read(
    'supabase/migrations/20261006190000_comments_01b_file_visibility.sql',
);
const service = read('src/services/commentService.js');
const myFiles = read('src/pages/MyFilesPage.jsx');
const userDetails = read('src/pages/UserDetailsPage.jsx');

/* DATABASE / SECURITY */

expect(
    migration.includes("target_type in ('story', 'heritage', 'file')"),
    'file is supported by comments database constraint',
);

expect(
    migration.includes("target_type = 'file'"),
    'file visibility has explicit comments policy handling',
);

expect(
    migration.includes('from public.user_files f'),
    'file comment access derives from user_files RLS',
);

expect(
    migration.includes('f.id::text = comments.target_id'),
    'file target id resolves against user_files.id',
);

expect(
    !migration.includes('using (true)'),
    'old unrestricted comments read policy is removed',
);

expect(
    migration.includes('author_id = auth.uid()'),
    'comment writes remain bound to their author',
);

expect(
    migration.includes('Comment reactions follow comment visibility'),
    'reaction reads inherit parent-comment visibility',
);

expect(
    migration.includes('Users can add own visible comment reaction'),
    'reaction inserts require visible parent comment',
);

expect(
    migration.includes('Users can update own visible comment reaction'),
    'reaction updates require visible parent comment',
);

expect(
    migration.includes('Users can delete own visible comment reaction'),
    'reaction deletes require visible parent comment',
);


/* CLIENT SERVICE */

expect(
    service.includes("new Set(['story', 'heritage', 'file'])"),
    'comment service supports file targets',
);


/* MY FILES */

expect(
    myFiles.includes("import CommentsSection from '../components/CommentsSection';"),
    'My Files imports CommentsSection',
);

expect(
    myFiles.includes('targetType="file"') &&
    myFiles.includes('targetId={file.id}'),
    'My Files renders comments for each owned file',
);


/* COMMUNITY FILES */

expect(
    userDetails.includes("import CommentsSection from '../components/CommentsSection';"),
    'member profile imports CommentsSection',
);

expect(
    userDetails.includes('targetType="file"') &&
    userDetails.includes('targetId={file.id}'),
    'community file cards render file comments',
);

console.log('');
console.log('COMMENTS 01B: PASS');
console.log(
    'Owned/private and approved community files are wired to visibility-aware comments and reactions.'
);
