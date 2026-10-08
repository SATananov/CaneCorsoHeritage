import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/pages/UsersPage.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function UsersPage()');
const end = source.indexOf('\n    return (', start);
assert.ok(start >= 0 && end > start, 'UsersPage logic must be extractable');
assert.match(source, /Promise\.allSettled\(/, 'member catalog must isolate optional public-contact failures');
assert.match(source, /profileResult\.status === 'rejected'/, 'profile failure must remain fatal');
assert.match(source, /contactResult\.status === 'fulfilled'/, 'public contacts must be optional');

const executable = `${source.slice(start, end)}
    return { profiles, contacts, loading, error };
}
UsersPage;`;

function harness({ profileOutcome, contactOutcome }) {
    const hooks = [];
    const effects = [];
    let cursor = 0;
    let mounted = true;

    const resolveOutcome = async (outcome) => {
        if (outcome instanceof Error) throw outcome;
        return outcome;
    };

    const Component = runInNewContext(executable, {
        AbortController,
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => `en:${key}`,
        fetchProfiles: () => resolveOutcome(profileOutcome),
        fetchPublicContacts: () => resolveOutcome(contactOutcome),
        useCallback(callback) { return callback; },
        useState(initial) {
            const index = cursor++;
            const slot = hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
            return [slot.value, (next) => {
                if (!mounted) return;
                slot.value = typeof next === 'function' ? next(slot.value) : next;
            }];
        },
        useEffect(callback, deps) {
            const index = cursor++;
            if (!hooks[index]) {
                hooks[index] = { deps };
                effects.push(() => { hooks[index].cleanup = callback(); });
            }
        },
    });

    const render = () => {
        cursor = 0;
        const view = Component();
        effects.splice(0).forEach((effect) => effect());
        return view;
    };

    return {
        render,
        async settle() { await setImmediate(); return render(); },
        dispose() { mounted = false; hooks.forEach((slot) => slot.cleanup?.()); },
    };
}

{
    const h = harness({
        profileOutcome: [{ id: 'member', display_name: 'Member' }],
        contactOutcome: [{ user_id: 'member', email: 'member@example.test' }],
    });
    try {
        h.render();
        const view = await h.settle();
        assert.equal(view.error, '');
        assert.equal(view.loading, false);
        assert.equal(view.profiles.length, 1);
        assert.equal(view.contacts.length, 1);
    } finally { h.dispose(); }
}

{
    const h = harness({
        profileOutcome: [{ id: 'member', display_name: 'Member' }],
        contactOutcome: new Error('contacts unavailable'),
    });
    try {
        h.render();
        const view = await h.settle();
        assert.equal(view.error, '', 'optional public-contact failure must not fail the member directory');
        assert.equal(view.loading, false);
        assert.equal(view.profiles.length, 1, 'profiles remain available when contacts fail');
        assert.equal(view.contacts.length, 0, 'failed optional contacts fall back to no contact details');
    } finally { h.dispose(); }
}

{
    const h = harness({
        profileOutcome: new Error('profiles unavailable'),
        contactOutcome: [{ user_id: 'member', email: 'member@example.test' }],
    });
    try {
        h.render();
        const view = await h.settle();
        assert.equal(view.error, 'en:loadError', 'profile failure must still fail the member directory');
        assert.equal(view.loading, false);
        assert.equal(view.profiles.length, 0);
    } finally { h.dispose(); }
}

console.log('PASS: FIX 28 member catalog optional-contact resilience');
