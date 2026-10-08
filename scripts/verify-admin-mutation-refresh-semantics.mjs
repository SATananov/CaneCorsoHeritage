import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/AdminPage.jsx');

const actionStart = page.indexOf('    async function runAction(');
const actionEnd = page.indexOf('    function confirmAndRun(', actionStart);
assert.ok(actionStart >= 0 && actionEnd > actionStart, 'runAction must exist');
const actionSource = page.slice(actionStart, actionEnd).replace(/^    /gm, '');

function makeHarness(refreshResult) {
    const state = {
        loading: false,
        error: '',
        message: '',
        busyKey: '',
    };
    const scopeRef = { current: { active: true, request: 0, action: false, controller: null } };
    const setLoading = (value) => { state.loading = value; };
    const setError = (value) => { state.error = value; };
    const setMessage = (value) => { state.message = value; };
    const setBusyKey = (value) => { state.busyKey = value; };
    const refreshDashboard = async () => {
        if (refreshResult === false) {
            setError('loadError');
            return false;
        }
        setError('');
        return true;
    };
    const runAction = runInNewContext(
        `({ scopeRef, refreshDashboard, setLoading, setError, setMessage, setBusyKey }) => {\n${actionSource}\nreturn runAction;\n}`,
    )({ scopeRef, refreshDashboard, setLoading, setError, setMessage, setBusyKey });
    return { state, scopeRef, runAction };
}

{
    const h = makeHarness(false);
    let writes = 0;
    await h.runAction('delete', 'deleted', async () => { writes += 1; });
    assert.equal(writes, 1, 'Committed action runs once');
    assert.equal(h.state.message, 'deleted', 'Committed action keeps its success message when reconciliation fails');
    assert.equal(h.state.error, 'loadError', 'Failed reconciliation is reported as a load error');
    assert.equal(h.state.busyKey, '', 'Busy state settles after the failed reconciliation');
    assert.equal(h.scopeRef.current.action, false, 'Action lock settles after the failed reconciliation');
}

{
    const h = makeHarness(true);
    await h.runAction('approve', 'approved', async () => {});
    assert.equal(h.state.message, 'approved', 'Successful reconciliation preserves the committed action success message');
    assert.equal(h.state.error, '', 'Successful reconciliation leaves no load error');
}

{
    const h = makeHarness(true);
    await h.runAction('approve', 'approved', async () => { throw new Error('Denied'); });
    assert.equal(h.state.message, '', 'Failed mutation must not show success');
    assert.equal(h.state.error, 'actionError', 'Failed mutation remains an action error');
}

assert.match(
    page,
    /if \(!afterAction\) setMessage\(''\);/,
    'Action-triggered reconciliation must not clear the committed success message',
);
assert.match(
    page,
    /const actionsDisabled = Boolean\(busyKey\) \|\| error === 'loadError';/,
    'Stale admin snapshots must disable mutation controls',
);
const guardedMutationButtons = (page.match(/disabled=\{actionsDisabled\}/g) ?? []).length;
assert.ok(guardedMutationButtons >= 7, 'All admin mutation controls must use the stale-snapshot guard');
assert.match(
    page,
    /if \(error === 'loadError'\) refreshDashboard\(\)/,
    'A read-only refresh path must remain available for recovery',
);

console.log('PASS: FIX 25 admin committed-action / refresh-failure semantics');
