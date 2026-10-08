import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261008104500_rls_policy_consistency_01.sql';
const migration = readFileSync(migrationPath, 'utf8');

function assert(condition, message) {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        process.exit(1);
    }

    console.log(`PASS: ${message}`);
}

const normalized = migration.replace(/\r\n/g, '\n');

const supersededPolicies = [
    'Heritage ratings are publicly readable',
    'Users can create own Heritage rating',
    'Users can update own Heritage rating',
    'Users can delete own Heritage rating',
    'Active users can create own comments',
    'Authenticated users can create own comments',
    'Authors can update own comments',
    'Authors can delete own comments',
    'Users can add own comment reaction',
    'Users can update own comment reaction',
    'Users can delete own comment reaction',
];

for (const policy of supersededPolicies) {
    assert(
        normalized.includes(`drop policy if exists "${policy}"`),
        `superseded policy is explicitly removed: ${policy}`,
    );
}

const canonicalPolicies = [
    'heritage_ratings_public_read',
    'heritage_ratings_active_insert',
    'heritage_ratings_own_update',
    'heritage_ratings_own_delete',
    'Comments follow target visibility',
    'Authenticated users can create own visible-target comments',
    'Authors or admins can update comments',
    'Authors or admins can delete comments',
    'Users can add own visible comment reaction',
    'Users can update own visible comment reaction',
    'Users can delete own visible comment reaction',
];

for (const policy of canonicalPolicies) {
    assert(
        normalized.includes(`create policy "${policy}"`),
        `canonical policy is recreated: ${policy}`,
    );
}

assert(
    /heritage_ratings_active_insert[\s\S]*public\.is_active_member\(\)[\s\S]*h\.status = 'published'/i.test(normalized),
    'Heritage rating insert requires active user and published article',
);

assert(
    !/heritage_ratings_(?:active_insert|own_update|own_delete)[\s\S]*not public\.is_admin\(\)/i.test(normalized),
    'Heritage rating policies preserve active admin eligibility',
);

assert(
    /heritage_ratings_public_read[\s\S]*h\.slug = heritage_ratings\.article_slug[\s\S]*h\.status = 'published'/i.test(normalized),
    'Heritage rating reads are limited to published articles',
);

assert(
    /Comments follow target visibility[\s\S]*target_type = 'heritage'[\s\S]*h\.slug = comments\.target_id[\s\S]*h\.status = 'published'/i.test(normalized),
    'Heritage comments require an existing published Heritage article',
);

assert(
    /Authenticated users can create own visible-target comments[\s\S]*author_id = auth\.uid\(\)[\s\S]*public\.is_active_member\(\)/i.test(normalized),
    'Comment creation requires ownership and active account',
);

assert(
    /Authors or admins can update comments[\s\S]*public\.is_active_member\(\)[\s\S]*author_id = auth\.uid\(\)[\s\S]*public\.is_admin\(\)/i.test(normalized),
    'Comment updates require active author or active admin path',
);

for (const policy of [
    'Users can add own visible comment reaction',
    'Users can update own visible comment reaction',
    'Users can delete own visible comment reaction',
]) {
    const start = normalized.indexOf(`create policy "${policy}"`);
    const next = normalized.indexOf('\ncreate policy ', start + 1);
    const section = normalized.slice(start, next === -1 ? normalized.length : next);

    assert(start !== -1 && section.includes('public.is_active_member()'), `${policy} requires an active account`);
    assert(section.includes('user_id = auth.uid()'), `${policy} enforces reaction ownership`);
    assert(section.includes('from public.comments c'), `${policy} follows parent comment visibility`);
}

console.log('PASS: RLS policy consistency migration preserves one strict canonical write path per protected action.');
