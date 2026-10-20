import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminService = fs.readFileSync('src/services/adminService.js', 'utf8');
const adminPage = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');
const storyService = fs.readFileSync('src/services/storyService.js', 'utf8');
const migration = fs.readFileSync(
    'supabase/migrations/20261020190000_story_moderation_boundary.sql',
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
    migration,
    /DROP POLICY IF EXISTS "admins can delete all stories" ON public\.stories;/,
    'Migration must remove unrestricted admin Story delete.',
);

assert.match(
    migration,
    /DROP POLICY IF EXISTS "admins can update all stories" ON public\.stories;/,
    'Migration must remove unrestricted admin Story update.',
);

assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.admin_moderate_story\(/,
    'Migration must create the scoped Story moderation function.',
);

assert.match(
    migration,
    /AND visibility = 'community';/,
    'Scoped Story moderation must be limited to Community Stories.',
);

assert.match(
    migration,
    /IF NOT public\.is_admin\(\) THEN/,
    'Scoped Story moderation must enforce the administrator guard.',
);

assert.match(
    migration,
    /target_moderation_status NOT IN \('approved', 'rejected', 'hidden'\)/,
    'Scoped Story moderation must allow only explicit moderation states.',
);

assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.admin_moderate_story\(uuid, text\) TO authenticated;/,
    'Authenticated clients need RPC execute permission; the function performs its own admin guard.',
);

console.log('PASS: Story author CRUD is owner-only and admin Story actions are moderation-only.');
