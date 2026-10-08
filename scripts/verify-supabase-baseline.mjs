import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const baselineRel = 'supabase/migrations/20261006100000_supabase_baseline_01.sql';
const firstFeatureRel = 'supabase/migrations/20261006152000_story_translation_01.sql';
const baselinePath = join(root, baselineRel);
const firstFeaturePath = join(root, firstFeatureRel);

const fail = (message) => {
    console.error(`FAIL: ${message}`);
    process.exit(1);
};

const pass = (message) => console.log(`PASS: ${message}`);

if (!existsSync(baselinePath)) fail(`${baselineRel} is missing`);
if (!existsSync(firstFeaturePath)) fail(`${firstFeatureRel} is missing`);

const sql = readFileSync(baselinePath, 'utf8').replace(/\r\n/g, '\n');
const firstFeature = readFileSync(firstFeaturePath, 'utf8').replace(/\r\n/g, '\n');
const normalized = sql.replace(/"/g, '').replace(/\s+/g, ' ').toLowerCase();

const requiredCoreTables = [
    'file_ratings',
    'heritage_articles',
    'profile_private_details',
    'profile_public_contacts',
    'profiles',
    'stories',
    'story_media',
    'story_ratings',
    'user_files',
    'user_roles',
];

for (const table of requiredCoreTables) {
    if (!normalized.includes(`create table if not exists public.${table}`)) {
        fail(`baseline is missing core table public.${table}`);
    }
    pass(`core table is baselined: public.${table}`);
}

const laterFeatureTables = [
    'story_translations',
    'heritage_translations',
    'comments',
    'comment_reactions',
    'heritage_ratings',
];

for (const table of laterFeatureTables) {
    if (normalized.includes(`create table if not exists public.${table}`)) {
        fail(`later feature table public.${table} must not be created by the baseline`);
    }
    pass(`later feature table stays in its tracked migration: public.${table}`);
}

if (/\boriginal_language\b/i.test(sql)) {
    fail('baseline must represent stories before original_language was added');
}
if (!/alter table public\.stories[\s\S]*add column if not exists original_language text/i.test(firstFeature)) {
    fail('first feature migration no longer owns stories.original_language');
}
pass('stories.original_language remains owned by the first tracked feature migration');

const authTriggers = [
    ['on_auth_user_created', 'public.handle_new_user'],
    ['on_auth_user_created_role', 'public.ensure_user_role'],
    ['zz_apply_signup_username', 'public.apply_signup_username'],
];
for (const [trigger, fn] of authTriggers) {
    const triggerPattern = new RegExp(`create trigger ${trigger}[\\s\\S]*after insert on auth\\.users[\\s\\S]*${fn.replace('.', '\\.')}`, 'i');
    if (!triggerPattern.test(normalized)) fail(`missing auth.users trigger ${trigger} -> ${fn}`);
    pass(`auth trigger is baselined: ${trigger}`);
}

if (!/create event trigger ensure_rls[\s\S]*ddl_command_end[\s\S]*create table[\s\S]*create table as[\s\S]*select into[\s\S]*public\.rls_auto_enable\(\)/i.test(normalized)) {
    fail('ensure_rls event trigger is missing or does not match the captured production semantics');
}
pass('project ensure_rls event trigger is baselined');

const requiredFunctions = [
    'admin_member_details',
    'apply_signup_username',
    'ensure_profile_username',
    'ensure_user_role',
    'handle_new_user',
    'is_active_member',
    'is_admin',
    'rls_auto_enable',
    'set_updated_at',
];
for (const fn of requiredFunctions) {
    if (!normalized.includes(`create or replace function public.${fn}`)) fail(`missing project function public.${fn}`);
}
pass('all 9 project-owned public functions are baselined');

const bucketChecks = [
    ["'avatars', 'avatars', true, 5242880", "'image/*'"],
    ["'heritage', 'heritage', true, 10485760", "'image/*'"],
    ["'stories', 'stories', true, 10485760", "'image/*'"],
    ["'user-files', 'user-files', false, 52428800", "'application/vnd.oasis.opendocument.text'"],
];
for (const [identity, mimeEvidence] of bucketChecks) {
    if (!normalized.includes(identity) || !normalized.includes(mimeEvidence)) {
        fail(`Storage bucket configuration is incomplete for ${identity.split(',')[0]}`);
    }
}
pass('all 4 project Storage buckets and limits/MIME allowlists are baselined');

const storagePolicies = [
    'active members can delete user storage',
    'active members can insert user storage',
    'active members can update user storage',
    'admins can delete user file storage',
    'avatars_delete_own_folder',
    'avatars_insert_own_folder',
    'avatars_public_read',
    'avatars_select_own_folder',
    'avatars_update_own_folder',
    'heritage_admin_delete',
    'heritage_admin_insert',
    'heritage_admin_select',
    'heritage_admin_update',
    'stories_images_delete_own_folder',
    'stories_images_insert_own_folder',
    'stories_images_public_read',
    'stories_images_update_own_folder',
    'user_files_storage_delete_own',
    'user_files_storage_insert_own',
    'user_files_storage_read',
    'user_files_storage_update_own',
];
for (const policy of storagePolicies) {
    if (!normalized.includes(`create policy ${policy.toLowerCase()} on storage.objects`)) {
        fail(`missing captured Storage policy: ${policy}`);
    }
}
pass('all 21 project-owned Storage RLS policies are baselined');

const forbiddenPlatformObjects = [
    'issue_graphql_placeholder',
    'issue_pg_cron_access',
    'issue_pg_graphql_access',
    'issue_pg_net_access',
    'pgrst_ddl_watch',
    'pgrst_drop_watch',
];
for (const eventTrigger of forbiddenPlatformObjects) {
    if (normalized.includes(`create event trigger ${eventTrigger}`)) {
        fail(`Supabase-managed event trigger must not be copied into project baseline: ${eventTrigger}`);
    }
}
pass('Supabase-managed event triggers are excluded from the project baseline');

if (!sql.includes('MARKED AS APPLIED')) {
    fail('baseline safety note about the existing linked project is missing');
}
pass('baseline documents that production must mark it applied rather than execute it');

console.log('SUPABASE BASELINE 01: PASS');
