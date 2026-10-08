import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const migration = readFileSync(new URL(
    '../supabase/migrations/20261008120000_attachment_privacy_active_admin_01.sql', import.meta.url,
), 'utf8');
const policies = migration.split(/alter policy /i).slice(1);
for (const name of ['Public can read approved community user files', 'user_files_storage_read']) {
    const policy = policies.find((part) => part.startsWith(`"${name}"`));
    assert.ok(policy, `Missing ${name}`);
    assert.match(policy, /story_id is null/);
    assert.match(policy, /s\.status = 'published'/);
    assert.match(policy, /s\.visibility = 'community'/);
    assert.match(policy, /s\.moderation_status = 'approved'/);
}
assert.match(migration, /security definer[\s\S]*?role = 'admin'[\s\S]*?account_status = 'active'/);
for (const operation of ['select', 'insert', 'update', 'delete']) {
    const policy = policies.find((part) => part.startsWith(`"heritage_admin_${operation}"`));
    assert.ok(policy);
    assert.match(policy, /public\.is_admin\(\)/);
    assert.match(policy, /p\.role = 'admin'/, 'Keep the pre-existing profile-role restriction');
}
console.log('STORY SECURITY: PASS (migration assertions)');

// Optional live coverage against the existing LOCAL Supabase stack only.
// Both migration and fixtures roll back; a psql error also aborts the transaction.
// Run: node scripts/verify-story-security.mjs --database
if (process.argv.includes('--database')) {
    const sql = `BEGIN;
SET LOCAL statement_timeout = '30s';
${migration}
DO $test$
<<fixture>>
DECLARE
    owner_id uuid := gen_random_uuid();
    member_id uuid := gen_random_uuid();
    admin_id uuid := gen_random_uuid();
    story_key text := gen_random_uuid()::text;
    attachment_id uuid := gen_random_uuid();
    standalone_id uuid := gen_random_uuid();
    heritage_name text := gen_random_uuid()::text || '.jpg';
    viewer text;
    parent_state text;
    changed integer;
    visible boolean;
    denied boolean;
BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    SELECT id, id::text || '@example.invalid', '{"display_name":"RLS test"}'::jsonb
    FROM unnest(ARRAY[owner_id, member_id, admin_id]) AS ids(id);
    UPDATE public.user_roles SET role = 'admin', account_status = 'active' WHERE user_id = admin_id;
    UPDATE public.profiles SET role = 'admin' WHERE id = admin_id;
    INSERT INTO public.stories (id, author_id, eyebrow, title, description, content, author,
        status, visibility, moderation_status)
    VALUES (story_key, owner_id, 'Test', 'Test', 'Test', 'Test', 'Test',
        'published', 'community', 'approved');
    INSERT INTO public.user_files (id, user_id, story_id, file_name, storage_path, mime_type,
        visibility, moderation_status)
    VALUES (attachment_id, owner_id, story_key, 'attached.txt', owner_id || '/' || attachment_id, 'text/plain', 'community', 'approved'),
        (standalone_id, owner_id, null, 'standalone.txt', owner_id || '/' || standalone_id, 'text/plain', 'community', 'approved');
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('user-files', owner_id || '/' || attachment_id),
        ('user-files', owner_id || '/' || standalone_id), ('heritage', heritage_name);

    -- Leave attachment flags approved/community, exactly as after failed client sync.
    FOREACH parent_state IN ARRAY ARRAY['public', 'private', 'hidden', 'pending', 'rejected', 'draft'] LOOP
        UPDATE public.stories SET
            visibility = CASE WHEN parent_state = 'private' THEN 'private' ELSE 'community' END,
            status = CASE WHEN parent_state = 'draft' THEN 'draft' ELSE 'published' END,
            moderation_status = CASE WHEN parent_state IN ('hidden', 'pending', 'rejected') THEN parent_state ELSE 'approved' END
        WHERE id = story_key;
        FOREACH viewer IN ARRAY ARRAY['anon', 'member', 'owner'] LOOP
            PERFORM set_config('request.jwt.claim.sub', CASE viewer WHEN 'anon' THEN '' WHEN 'owner' THEN owner_id::text ELSE member_id::text END, true);
            PERFORM set_config('role', CASE WHEN viewer = 'anon' THEN 'anon' ELSE 'authenticated' END, true);
            visible := parent_state = 'public' OR viewer = 'owner';
            IF (EXISTS (SELECT 1 FROM public.user_files WHERE id = attachment_id)) <> visible THEN
                RAISE EXCEPTION 'Attachment metadata access incorrect for % / %', parent_state, viewer;
            END IF;
            IF (EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'user-files' AND name = fixture.owner_id || '/' || attachment_id)) <> visible THEN
                RAISE EXCEPTION 'Attachment object access incorrect for % / %', parent_state, viewer;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.user_files WHERE id = standalone_id)
                OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'user-files' AND name = fixture.owner_id || '/' || standalone_id) THEN
                RAISE EXCEPTION 'Standalone community file access regressed';
            END IF;
            PERFORM set_config('role', 'postgres', true);
        END LOOP;
    END LOOP;
    RAISE NOTICE 'PASS: 18 parent-state/viewer combinations for metadata and storage; standalone reads preserved';

    -- The same admin identity loses privileges immediately when deactivated.
    FOREACH parent_state IN ARRAY ARRAY['active', 'inactive'] LOOP
        UPDATE public.user_roles SET account_status = parent_state WHERE user_id = admin_id;
        PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
        PERFORM set_config('role', 'authenticated', true);
        visible := parent_state = 'active';
        IF public.is_admin() <> visible THEN RAISE EXCEPTION 'is_admin ignores account status'; END IF;
        IF (EXISTS (SELECT 1 FROM public.stories WHERE id = story_key)) <> visible
            OR (EXISTS (SELECT 1 FROM public.user_files WHERE id = attachment_id)) <> visible THEN
            RAISE EXCEPTION 'Admin read policies ignore account status';
        END IF;
        UPDATE public.stories SET title = 'Admin test' WHERE id = story_key;
        GET DIAGNOSTICS changed = ROW_COUNT;
        IF changed <> (CASE WHEN visible THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'Admin story update access incorrect'; END IF;
        denied := false;
        BEGIN
            PERFORM * FROM public.admin_member_details(owner_id);
        EXCEPTION WHEN raise_exception THEN
            IF SQLERRM <> 'Administrator access required' THEN RAISE; END IF;
            denied := true;
        END;
        IF denied = visible THEN RAISE EXCEPTION 'Admin RPC access incorrect'; END IF;
        IF (EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'heritage' AND name = heritage_name)) <> visible THEN
            RAISE EXCEPTION 'Heritage admin read access incorrect';
        END IF;
        UPDATE storage.objects SET metadata = '{"test":true}'::jsonb WHERE bucket_id = 'heritage' AND name = heritage_name;
        GET DIAGNOSTICS changed = ROW_COUNT;
        IF changed <> (CASE WHEN visible THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'Heritage admin update access incorrect'; END IF;
        denied := false;
        BEGIN
            INSERT INTO storage.objects (bucket_id, name) VALUES ('heritage', parent_state || heritage_name);
        EXCEPTION WHEN insufficient_privilege THEN denied := true;
        END;
        IF denied = visible THEN RAISE EXCEPTION 'Heritage admin insert access incorrect'; END IF;
        PERFORM set_config('storage.allow_delete_query', 'true', true);
        DELETE FROM storage.objects WHERE bucket_id = 'heritage' AND name = 'active' || heritage_name;
        GET DIAGNOSTICS changed = ROW_COUNT;
        IF changed <> (CASE WHEN visible THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'Heritage admin delete access incorrect'; END IF;
        PERFORM set_config('role', 'postgres', true);
        -- Restore a real target so inactive DELETE must reject an existing row.
        IF visible THEN INSERT INTO storage.objects (bucket_id, name) VALUES ('heritage', 'active' || heritage_name); END IF;
    END LOOP;
    RAISE NOTICE 'PASS: active/inactive admin helper, RLS reads/writes, RPC and all four Heritage policies';
END;
$test$;
ROLLBACK;
`;
    const result = spawnSync('docker', ['exec', '-i', 'supabase_db_CaneCorsoHeritage',
        'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', timeout: 60000 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    assert.ifError(result.error);
    assert.equal(result.status, 0, 'Rollback-only database assertions failed');
    assert.match(result.stdout, /ROLLBACK/);
    console.log('STORY SECURITY: PASS (local PostgreSQL RLS tests; all changes rolled back)');
} else {
    console.log('Local database checks require --database; not run by the default offline suite.');
}
