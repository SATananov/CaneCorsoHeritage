import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261015172000_inactive_social_rls.sql';
const sql = readFileSync(migrationPath, 'utf8');

const tablePolicies = [
    ['public.friendships', 'active members can use friendships'],
    ['public.conversations', 'active members can use conversations'],
    ['public.messages', 'active members can use private messages'],
    ['public.conversation_reads', 'active members can use conversation reads'],
];

for (const [table, policy] of tablePolicies) {
    assert.ok(
        sql.includes(`drop policy if exists "${policy}"\non ${table};`),
        `missing idempotent drop for ${policy}`,
    );

    const escapedTable = table.replace('.', '\\.');
    assert.match(
        sql,
        new RegExp(
            `create policy "${policy}"[\\s\\S]*?on ${escapedTable}[\\s\\S]*?as restrictive[\\s\\S]*?for all[\\s\\S]*?to authenticated`,
            'i',
        ),
        `${policy} must be restrictive and authenticated-only`,
    );
}

const activeChecks = sql.match(/public\.is_active_member\(\)/g) ?? [];
const adminChecks = sql.match(/public\.is_admin\(\)/g) ?? [];

assert.ok(activeChecks.length >= 10, 'all USING/WITH CHECK guards must enforce active membership');
assert.ok(adminChecks.length >= 10, 'all guards must preserve admin eligibility');

assert.match(
    sql,
    /create policy "active members can use message attachments"[\s\S]*?on storage\.objects[\s\S]*?as restrictive[\s\S]*?for all[\s\S]*?bucket_id <> 'message-attachments'[\s\S]*?public\.is_active_member\(\)/i,
    'message attachment restriction must be bucket-scoped without affecting other Storage buckets',
);

assert.doesNotMatch(sql, /drop table/i);
assert.doesNotMatch(sql, /alter table/i);
assert.doesNotMatch(sql, /create table/i);

console.log(
    'PASS: inactive authenticated accounts are restricted from Friends, private messaging, read state and message attachments.',
);
