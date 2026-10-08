import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/StoryDeleteModal.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function StoryDeleteModal');
const end = source.indexOf('\n    return (', start);
assert.ok(start >= 0 && end > start);
assert.match(source, /onMouseDown=\{closeHandler\}/);
assert.match(source, /onClick=\{closeHandler\} disabled=\{isDeleting\}/);
assert.doesNotMatch(source, /on(?:Click|MouseDown)=\{onClose\}/);
const component = `${source.slice(start, end)}
    return { closeHandler, deleteHandler, isDeleting, error };
}
StoryDeleteModal;`;

function deferred() {
    let resolve; let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function harness() {
    const hooks = []; let cursor = 0; let closed = 0; let deleted = 0;
    const mutation = deferred(); const completion = deferred();
    const Modal = runInNewContext(component, {
        useLanguage: () => ({ language: 'en' }),
        getTranslation: (_language, _section, key) => key,
        getStoryDeleteCleanupWarning: () => 'cleanup warning',
        useState(initial) {
            const index = cursor++;
            if (!(index in hooks)) hooks[index] = initial;
            return [hooks[index], (value) => { hooks[index] = value; }];
        },
        useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
        deleteStory() { deleted++; return mutation.promise; },
    });
    const render = () => {
        cursor = 0;
        return Modal({ story: { _id: 'story' }, onClose: () => { closed++; },
            onDeleted: () => completion.promise });
    };
    return { render, mutation, completion, closed: () => closed, deleted: () => deleted };
}

for (const committedCleanupFailure of [false, true]) {
    const h = harness();
    const initial = h.render();
    const running = initial.deleteHandler();
    initial.closeHandler();
    await initial.deleteHandler();
    assert.equal(h.closed(), 0);
    assert.equal(h.deleted(), 1, 'Same-tick duplicate deletion is blocked');
    assert.equal(h.render().isDeleting, true);
    if (committedCleanupFailure) h.mutation.reject({ storyDeleteCommitted: true });
    else h.mutation.resolve();
    await setImmediate();
    h.render().closeHandler();
    assert.equal(h.closed(), 0, 'Dismissal remains blocked while refreshing the parent');
    h.completion.resolve();
    await running;
    assert.equal(h.closed(), 1);
    assert.equal(h.render().isDeleting, false);
}
const failed = harness();
const running = failed.render().deleteHandler();
failed.mutation.reject(new Error('Delete failed'));
await running;
assert.equal(failed.closed(), 0);
assert.equal(failed.render().isDeleting, false);
assert.equal(failed.render().error, 'error');
failed.render().closeHandler();
assert.equal(failed.closed(), 1, 'Failure unlocks dismissal');
const idle = harness();
idle.render().closeHandler();
assert.equal(idle.closed(), 1);
console.log('STORY DELETE DISMISSAL: PASS (pending, completion, failure and idle)');
