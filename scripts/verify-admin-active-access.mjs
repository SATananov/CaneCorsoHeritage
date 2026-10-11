import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
    new URL('../src/routing/RequireAdmin.jsx', import.meta.url),
    'utf8',
).replace(/^\uFEFF/, '');

assert.match(
    source,
    /const \{ user, loading, roleLoading, roleError, isAdmin, isActive \} = useAuth\(\);/,
    'RequireAdmin must consume explicit active-account state.',
);

assert.match(
    source,
    /if \(loading \|\| roleLoading \|\| \(user && roleError\)\)/,
    'RequireAdmin must wait until authentication and role/status loading are complete.',
);

assert.match(
    source,
    /if \(!user \|\| !isAdmin \|\| !isActive\)/,
    'RequireAdmin must fail closed unless the account is signed in, admin, and explicitly active.',
);

const executable = source
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export default RequireAdmin;\s*$/, '')
    .replace(
        /return \(\s*<main[\s\S]*?<\/main>\s*\);/,
        "return { kind: 'loading' };",
    )
    .replace(
        '<Navigate to="/" replace />',
        "{ kind: 'redirect', to: '/', replace: true }",
    )
    .replace('<Outlet />', "{ kind: 'outlet' }");

assert.ok(
    !executable.includes('<Navigate')
    && !executable.includes('<Outlet')
    && !executable.includes('<main'),
    'Verifier must replace only RequireAdmin presentation JSX.',
);

function evaluate(auth) {
    const RequireAdmin = runInNewContext(`${executable}\nRequireAdmin;`, {
        useAuth: () => auth,
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
    });

    return RequireAdmin();
}

function assertView(actual, expected, message) {
    assert.equal(actual.kind, expected.kind, message);
    assert.equal(actual.to ?? null, expected.to ?? null, message);
    assert.equal(actual.replace ?? null, expected.replace ?? null, message);
}

assertView(
    evaluate({
        user: { id: 'admin' },
        loading: false,
        roleLoading: true,
        isAdmin: true,
        isActive: false,
    }),
    { kind: 'loading' },
    'Unknown/pending account status must not enter the admin route.',
);

assertView(
    evaluate({
        user: { id: 'admin' },
        loading: false,
        roleLoading: false,
        isAdmin: true,
        isActive: false,
    }),
    { kind: 'redirect', to: '/', replace: true },
    'Inactive admin accounts must be redirected home.',
);

assertView(
    evaluate({
        user: { id: 'member' },
        loading: false,
        roleLoading: false,
        isAdmin: false,
        isActive: true,
    }),
    { kind: 'redirect', to: '/', replace: true },
    'Active non-admin accounts must remain blocked.',
);

assertView(
    evaluate({
        user: { id: 'admin' },
        loading: false,
        roleLoading: false,
        isAdmin: true,
        isActive: true,
    }),
    { kind: 'outlet' },
    'Only explicitly active admin accounts may enter the admin route.',
);

console.log('verify-admin-active-gating: PASS (8 checks)');
