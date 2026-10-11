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

const migration = read('supabase/migrations/20261006173000_comments.sql');
const fileVisibilityMigration = read('supabase/migrations/20261006190000_file_comments.sql');
const rlsConsistencyMigration = read('supabase/migrations/20261008104500_security_policies.sql');
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
    'Initial comment rules restrict updates to the author',
);

expect(
    migration.includes('for delete') &&
    migration.includes('using (author_id = auth.uid())'),
    'Initial comment rules restrict deletes to the author',
);

expect(
    fileVisibilityMigration.includes("target_type in ('story', 'heritage', 'file')"),
    'File comments extend comment targets to files',
);

expect(
    rlsConsistencyMigration.includes('create policy "Authors or admins can update comments"') &&
    rlsConsistencyMigration.includes('author_id = auth.uid()') &&
    rlsConsistencyMigration.includes('or public.is_admin()'),
    'final RLS allows comment update by the author or an admin',
);

expect(
    rlsConsistencyMigration.includes('create policy "Authors or admins can delete comments"') &&
    rlsConsistencyMigration.includes('author_id = auth.uid()') &&
    rlsConsistencyMigration.includes('or public.is_admin()'),
    'final RLS allows comment delete by the author or an admin',
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
    'comment service supports Story, Heritage and file targets',
);

expect(
    heritage.includes('CommentsSection'),
    'Heritage article page renders comments',
);

expect(
    story.includes('CommentsSection'),
    'Story details page renders comments',
);

console.log('COMMENTS AND RLS: PASS');
console.log('Public read, authenticated own-create, file targets, author UI controls and final author-or-admin RLS mutations are verified.');
