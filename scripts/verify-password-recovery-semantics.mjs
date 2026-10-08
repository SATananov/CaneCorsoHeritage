import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const providerSourceRaw = read('src/context/AuthProvider.jsx');
assert.match(providerSourceRaw, /useState\(null\).*passwordRecovery|passwordRecovery, setPasswordRecovery\] = useState\(null\)/s,
    'Password recovery state must start unresolved');
assert.ok(providerSourceRaw.includes("event === 'PASSWORD_RECOVERY'"),
    'AuthProvider must recognize the PASSWORD_RECOVERY event');
assert.ok(providerSourceRaw.includes('passwordRecovery,'),
    'AuthProvider must expose recovery state through context');

const providerSource = providerSourceRaw
    .replace(/^import .+;\r?\n/gm, '')
    .replace(
        /return \(\s*<AuthContext\.Provider value=\{value\}>\s*\{children\}\s*<\/AuthContext\.Provider>\s*\);/,
        'return value;',
    )
    .replace(/export default AuthProvider;\s*$/, '');

function deferred() {
    let resolve;
    const promise = new Promise((yes) => { resolve = yes; });
    return { promise, resolve };
}

function providerHarness() {
    const state = [];
    let hookIndex = 0;
    let effect;
    let cleanup;
    let callback;
    let writes = 0;
    const sessionRequest = deferred();

    const supabase = {
        auth: {
            getSession: () => sessionRequest.promise,
            onAuthStateChange(next) {
                callback = next;
                return { data: { subscription: { unsubscribe() {} } } };
            },
        },
        from() {
            return {
                select() { return this; },
                eq() { return this; },
                maybeSingle() { return new Promise(() => {}); },
            };
        },
    };

    const Provider = runInNewContext(`${providerSource}\nAuthProvider;`, {
        supabase,
        console: { error() {} },
        useState(initial) {
            const index = hookIndex++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => {
                state[index] = typeof value === 'function' ? value(state[index]) : value;
                writes++;
            }];
        },
        useEffect(nextEffect, dependencies) {
            assert.equal(dependencies.length, 0);
            effect = nextEffect;
        },
    });

    function render() {
        hookIndex = 0;
        return Provider({ children: null });
    }

    render();
    cleanup = effect();

    return {
        render,
        emit(event, userId = 'A') {
            callback(event, userId ? { user: { id: userId } } : null);
            return render();
        },
        writes: () => writes,
        dispose() { cleanup(); },
        lateEmit(event, userId = 'A') { callback(event, userId ? { user: { id: userId } } : null); },
    };
}

{
    const h = providerHarness();
    assert.equal(h.render().passwordRecovery, null, 'Recovery state must remain unresolved before the first auth event');
    assert.equal(h.emit('PASSWORD_RECOVERY').passwordRecovery, true,
        'PASSWORD_RECOVERY must unlock the password-reset flow');
    assert.equal(h.emit('INITIAL_SESSION').passwordRecovery, true,
        'A late INITIAL_SESSION notification must not erase an observed recovery event');
    assert.equal(h.emit('TOKEN_REFRESHED').passwordRecovery, true,
        'Token refresh must not erase an active recovery flow');
    assert.equal(h.emit('SIGNED_IN').passwordRecovery, false,
        'A normal sign-in must not be treated as password recovery');
    assert.equal(h.emit('PASSWORD_RECOVERY').passwordRecovery, true);
    assert.equal(h.emit('SIGNED_OUT', null).passwordRecovery, false,
        'Sign-out must clear recovery state');
    h.dispose();
    const writes = h.writes();
    h.lateEmit('PASSWORD_RECOVERY');
    assert.equal(h.writes(), writes, 'Unmounted provider must ignore late recovery events');
}

const pageRaw = read('src/pages/UpdatePasswordPage.jsx');
assert.doesNotMatch(pageRaw, /supabase\.auth\.getSession|from '\.\.\/lib\/supabaseClient'/,
    'UpdatePasswordPage must not accept an ordinary stored session as recovery proof');
assert.match(pageRaw, /passwordRecovery\s*,\s*updatePassword\s*,\s*logout/,
    'UpdatePasswordPage must consume recovery state from AuthProvider');
assert.match(pageRaw, /const recoveryReady = passwordRecovery === true;/,
    'Only explicit recovery state may unlock the form');
assert.match(pageRaw, /const checkingSession = passwordRecovery === null;/,
    'Unresolved recovery state must stay in the verifying UI');

const importsRemoved = pageRaw.replace(/^import .+;\r?\n/gm, '');
const start = importsRemoved.indexOf('function UpdatePasswordPage()');
const returnStart = importsRemoved.indexOf('\n    return (', start);
assert.ok(start >= 0 && returnStart > start, 'UpdatePasswordPage function body must be extractable');
const pageSource = `${importsRemoved.slice(start, returnStart)}
    return { handleSubmit, setPassword, setConfirmPassword, recoveryReady, checkingSession,
        submitting, errorMessage, passwordUpdated };
}
UpdatePasswordPage;`;

function pageHarness({ recovery = true, updateOutcome = 'success', logoutOutcome = 'success' } = {}) {
    const state = [];
    let hookIndex = 0;
    const navigation = [];
    let updateCalls = 0;
    let logoutCalls = 0;

    const updatePassword = async () => {
        updateCalls++;
        if (updateOutcome === 'error') throw new Error('Update failed');
    };
    const logout = async () => {
        logoutCalls++;
        if (logoutOutcome === 'error') throw new Error('Sign-out failed');
    };

    const Page = runInNewContext(pageSource, {
        useCallback: (callback) => callback,
        useState(initial) {
            const index = hookIndex++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => {
                state[index] = typeof value === 'function' ? value(state[index]) : value;
            }];
        },
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        useNavigate: () => (to, options) => navigation.push({ to, ...options }),
        useAuth: () => ({ passwordRecovery: recovery, updatePassword, logout }),
    });

    function render() {
        hookIndex = 0;
        return Page();
    }

    return {
        render,
        navigation,
        updateCalls: () => updateCalls,
        logoutCalls: () => logoutCalls,
        async submitValid() {
            let view = render();
            view.setPassword('a-secure-password');
            view = render();
            view.setConfirmPassword('a-secure-password');
            view = render();
            await view.handleSubmit({ preventDefault() {} });
            return render();
        },
    };
}

{
    const unresolved = pageHarness({ recovery: null }).render();
    assert.equal(unresolved.checkingSession, true);
    assert.equal(unresolved.recoveryReady, false);

    const ordinary = pageHarness({ recovery: false }).render();
    assert.equal(ordinary.checkingSession, false);
    assert.equal(ordinary.recoveryReady, false, 'Ordinary authenticated session must not unlock reset form');

    const recovery = pageHarness({ recovery: true }).render();
    assert.equal(recovery.recoveryReady, true);
}

{
    const h = pageHarness({ updateOutcome: 'error' });
    const view = await h.submitValid();
    assert.equal(h.updateCalls(), 1);
    assert.equal(h.logoutCalls(), 0, 'Failed password update must not attempt sign-out');
    assert.equal(view.passwordUpdated, false);
    assert.equal(view.errorMessage, 'updateError');
    assert.equal(h.navigation.length, 0);
}

{
    const h = pageHarness({ logoutOutcome: 'error' });
    const view = await h.submitValid();
    assert.equal(h.updateCalls(), 1);
    assert.equal(h.logoutCalls(), 1);
    assert.equal(view.passwordUpdated, true,
        'Successful password update must remain success even if sign-out fails');
    assert.equal(view.errorMessage, '',
        'Sign-out failure must not be reported as password-update failure');
    assert.equal(view.submitting, false);
    assert.equal(h.navigation.length, 0, 'Failed sign-out must not navigate into the guest-only login route');
}

{
    const h = pageHarness();
    const view = await h.submitValid();
    assert.equal(view.passwordUpdated, true);
    assert.equal(h.navigation.length, 1);
    assert.equal(h.navigation[0].to, '/login');
    assert.equal(h.navigation[0].replace, true);
    assert.equal(h.navigation[0].state.passwordUpdated, true);
}

console.log('PASS: FIX 21 password recovery state semantics');
