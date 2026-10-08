import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const admin = read('src/pages/AdminPage.jsx');
const ui = read('src/i18n/applicationUi.js');

const membersStart = admin.indexOf("activeSection === 'members'");
const membersEnd = admin.indexOf("activeSection === 'stories'", membersStart);
assert.ok(membersStart >= 0 && membersEnd > membersStart, 'Admin members section must exist');
const members = admin.slice(membersStart, membersEnd);

assert.doesNotMatch(
    members,
    /roleInfo\?\.account_status\s*\?\?\s*['"]active['"]/,
    'Missing role information must not default the account status to active',
);
assert.doesNotMatch(
    members,
    /roleInfo\?\.role\s*\?\?\s*['"]user['"]/,
    'Missing role information must not default the member role to user',
);
assert.match(
    members,
    /const role = roleInfo\?\.role \?\? 'unknown';/,
    'Missing member role must resolve to unknown',
);
assert.match(
    members,
    /const accountStatus = roleInfo\?\.account_status \?\? 'unknown';/,
    'Missing account status must resolve to unknown',
);
assert.match(
    members,
    /const canChangeAccountStatus = Boolean\(roleInfo\)[\s\S]*\['active', 'inactive'\]\.includes\(accountStatus\);/,
    'Account-status mutation must require role data and an explicit active/inactive status',
);
assert.ok(
    members.includes(') : canChangeAccountStatus ? ('),
    'Activate/deactivate control must be gated by canChangeAccountStatus',
);

const gateIndex = members.indexOf(') : canChangeAccountStatus ? (');
const mutationIndex = members.indexOf('setMemberAccountStatus(', gateIndex);
assert.ok(gateIndex >= 0 && mutationIndex > gateIndex, 'Member account mutation must sit behind the status gate');

const roleFallback = members.match(/const role = roleInfo\?\.role \?\? '([^']+)'/)?.[1];
const statusFallback = members.match(/const accountStatus = roleInfo\?\.account_status \?\? '([^']+)'/)?.[1];
const allowedStatuses = [...members.matchAll(/\['([^']+)', '([^']+)'\]\.includes\(accountStatus\)/g)][0]?.slice(1);
assert.equal(roleFallback, 'unknown');
assert.equal(statusFallback, 'unknown');
assert.deepEqual(allowedStatuses, ['active', 'inactive']);

const resolveMemberState = (roleInfo) => {
    const role = roleInfo?.role ?? roleFallback;
    const accountStatus = roleInfo?.account_status ?? statusFallback;
    const canChangeAccountStatus = Boolean(roleInfo) && allowedStatuses.includes(accountStatus);
    return { role, accountStatus, canChangeAccountStatus };
};

assert.deepEqual(
    resolveMemberState(undefined),
    { role: 'unknown', accountStatus: 'unknown', canChangeAccountStatus: false },
    'Missing role row must be fail-closed and non-actionable',
);
assert.deepEqual(
    resolveMemberState({ role: 'user', account_status: 'active' }),
    { role: 'user', accountStatus: 'active', canChangeAccountStatus: true },
    'Explicit active member must remain actionable',
);
assert.deepEqual(
    resolveMemberState({ role: 'user', account_status: 'inactive' }),
    { role: 'user', accountStatus: 'inactive', canChangeAccountStatus: true },
    'Explicit inactive member must remain actionable',
);
assert.equal(
    resolveMemberState({ role: 'user', account_status: null }).canChangeAccountStatus,
    false,
    'Unknown/null status must not expose an account mutation action',
);

const unknownTranslations = [...ui.matchAll(/statusUnknown:\s*'([^']+)'/g)].map((match) => match[1]);
assert.deepEqual(
    unknownTranslations,
    ['unknown', 'неизвестен', 'sconosciuto'],
    'Admin unknown status must be localized in EN/BG/IT',
);

console.log('PASS: FIX 26 admin member status fail-closed semantics');
