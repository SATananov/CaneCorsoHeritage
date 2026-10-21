import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminService = fs.readFileSync('src/services/adminService.js', 'utf8');
const adminPage = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');
const storyService = fs.readFileSync('src/services/storyService.js', 'utf8');
const baselineMigration = fs.readFileSync(
    'supabase/migrations/20261006100000_supabase_start.sql',
    'utf8',
);
const boundaryMigration = fs.readFileSync(
    'supabase/migrations/20261020190000_story_moderation_boundary.sql',
    'utf8',
);
const typeFixMigration = fs.readFileSync(
    'supabase/migrations/20261021070000_story_moderation_rpc_story_id_text.sql',
    'utf8',
);

assert.match(
    storyService,
    /stories\?id=eq\.\$\{encodeURIComponent\(storyId\)\}&author_id=eq\.\$\{encodeURIComponent\(session\.user\.id\)\}&select=\*/,
    'Story update must keep the author_id owner filter.',
);

assert.match(
    storyService,
    /stories\?id=eq\.\$\{encodeURIComponent\(storyId\)\}&author_id=eq\.\$\{encodeURIComponent\(session\.user\.id\)\}&select=id/,
    'Story delete must keep the author_id owner filter.',
);

assert.doesNotMatch(
    adminService,
    /adminDeleteStory/,
    'Admin service must not expose a hard-delete Story path.',
);

assert.doesNotMatch(
    adminPage,
    /adminDeleteStory/,
    'Admin UI must not expose a hard-delete Story action.',
);

assert.match(
    adminService,
    /\.rpc\('admin_moderate_story',\s*\{/,
    'Admin Story moderation must use the narrow RPC boundary.',
);

assert.match(
    adminPage,
    /moderateStory\(story\.id,\s*'rejected'\)/,
    'Pending Community Stories must retain a reject moderation action.',
);

assert.match(
    adminPage,
    /moderateStory\(story\.id,\s*'hidden'\)/,
    'Approved Community Stories must retain a hide moderation action.',
);

assert.match(
    boundaryMigration,
    /DROP POLICY IF EXISTS "admins can delete all stories" ON public\.stories;/,
    'Migration must remove unrestricted admin Story delete.',
);

assert.match(
    boundaryMigration,
    /DROP POLICY IF EXISTS "admins can update all stories" ON public\.stories;/,
    'Migration must remove unrestricted admin Story update.',
);

assert.match(
    boundaryMigration,
    /CREATE OR REPLACE FUNCTION public\.admin_moderate_story\(/,
    'Migration must create the scoped Story moderation function.',
);

assert.match(
    boundaryMigration,
    /AND visibility = 'community';/,
    'Scoped Story moderation must be limited to Community Stories.',
);

assert.match(
    boundaryMigration,
    /IF NOT public\.is_admin\(\) THEN/,
    'Scoped Story moderation must enforce the administrator guard.',
);

assert.match(
    boundaryMigration,
    /target_moderation_status NOT IN \('approved', 'rejected', 'hidden'\)/,
    'Scoped Story moderation must allow only explicit moderation states.',
);

assert.match(
    baselineMigration,
    /CREATE TABLE IF NOT EXISTS "public"\."stories"[\s\S]*?"id" "text" DEFAULT \("gen_random_uuid"\(\)\)::"text" NOT NULL/,
    'The verifier must confirm that stories.id is text in the recorded schema.',
);

assert.match(
    typeFixMigration,
    /DROP FUNCTION IF EXISTS public\.admin_moderate_story\(uuid, text\);/,
    'The corrective migration must remove the incompatible UUID overload.',
);

assert.match(
    typeFixMigration,
    /target_story_id text/,
    'Story moderation RPC must accept the real text Story id type.',
);

assert.doesNotMatch(
    typeFixMigration,
    /target_story_id uuid/,
    'The corrective Story moderation RPC must not reintroduce the UUID mismatch.',
);

assert.match(
    typeFixMigration,
    /WHERE id = target_story_id/,
    'The corrected RPC must compare text Story ids without an implicit type mismatch.',
);

assert.match(
    typeFixMigration,
    /AND visibility = 'community';/,
    'The corrected RPC must remain limited to Community Stories.',
);

assert.match(
    typeFixMigration,
    /GRANT EXECUTE ON FUNCTION public\.admin_moderate_story\(text, text\) TO authenticated;/,
    'Authenticated clients need execute permission on the corrected text/text RPC.',
);

console.log('PASS: Story author CRUD is owner-only and admin Story actions are moderation-only.');
