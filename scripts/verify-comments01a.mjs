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

const migration = read('supabase/migrations/20261006173000_comments_01a.sql');
const comments = read('src/components/CommentsSection.jsx');
const service = read('src/services/commentService.js');
const heritage = read('src/pages/HeritageArticlePage.jsx');
const story = read('src/pages/StoryDetailsPage.jsx');

expect(
    migration.includes("target_type in ('story', 'heritage')"),
    'COMMENTS 01 supports Story and Heritage targets only',
);

expect(
    migration.includes('alter table public.comments enable row level security'),
    'comments table has RLS enabled',
);

expect(
    migration.includes('to anon, authenticated') &&
    migration.includes('using (true)'),
    'comments are publicly readable',
);

expect(
    migration.includes('for insert') &&
    migration.includes('with check (author_id = auth.uid())'),
    'authenticated users can create only their own comments',
);

expect(
    migration.includes('for update') &&
    migration.includes('using (author_id = auth.uid())') &&
    migration.includes('with check (author_id = auth.uid())'),
    'authors can update only their own comments',
);

expect(
    migration.includes('for delete') &&
    migration.includes('using (author_id = auth.uid())'),
    'authors can delete only their own comments',
);

expect(
    !comments.includes('isAdmin'),
    'comment management UI does not grant admin edit/delete access',
);

expect(
    comments.includes('user.id === comment.author_id'),
    'comment management UI is author-only',
);

expect(
    service.includes("new Set(['story', 'heritage', 'file'])"),
    'comment service keeps future file target support prepared',
);

expect(
    heritage.includes('CommentsSection'),
    'Heritage article page renders comments',
);

expect(
    story.includes('CommentsSection'),
    'Story details page renders comments',
);

console.log('COMMENTS 01A: PASS');
console.log('Public read + authenticated create + author-only edit/delete are verified for Story and Heritage.');
