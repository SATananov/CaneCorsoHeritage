import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
    new URL('../src/components/CommentsSection.jsx', import.meta.url),
    'utf8',
);

const helperStart = source.indexOf('async function fetchCommentSecondaryData(');
const componentStart = source.indexOf('function CommentsSection(');
assert.ok(helperStart >= 0 && componentStart > helperStart, 'secondary-data helper must exist');

const helperSource = `${source.slice(helperStart, componentStart)}\nfetchCommentSecondaryData;`;

function makeHelper({ profiles, reactions }) {
    const calls = { profiles: 0, reactions: 0 };
    const fetchCommentAuthorProfiles = async () => {
        calls.profiles += 1;
        if (profiles instanceof Error) throw profiles;
        return profiles;
    };
    const fetchCommentReactions = async () => {
        calls.reactions += 1;
        if (reactions instanceof Error) throw reactions;
        return reactions;
    };
    const helper = runInNewContext(helperSource, {
        fetchCommentAuthorProfiles,
        fetchCommentReactions,
        Promise,
    });
    return { helper, calls };
}

const comments = [
    { id: 'c1', author_id: 'u1' },
    { id: 'c2', author_id: 'u2' },
];

{
    const { helper, calls } = makeHelper({
        profiles: [{ id: 'u1' }],
        reactions: [{ comment_id: 'c1', reaction: 'like' }],
    });
    const result = await helper(comments);
    assert.equal(calls.profiles, 1);
    assert.equal(calls.reactions, 1);
    assert.equal(result.profiles.length, 1);
    assert.equal(result.reactions.length, 1);
}

{
    const { helper } = makeHelper({
        profiles: new Error('profiles unavailable'),
        reactions: [{ comment_id: 'c1' }],
    });
    const result = await helper(comments);
    assert.equal(result.profiles.length, 0);
    assert.equal(result.reactions.length, 1);
}

{
    const { helper } = makeHelper({
        profiles: [{ id: 'u1' }],
        reactions: new Error('reactions unavailable'),
    });
    const result = await helper(comments);
    assert.equal(result.profiles.length, 1);
    assert.equal(result.reactions.length, 0);
}

{
    const { helper } = makeHelper({
        profiles: new Error('profiles unavailable'),
        reactions: new Error('reactions unavailable'),
    });
    const result = await helper(comments);
    assert.equal(result.profiles.length, 0);
    assert.equal(result.reactions.length, 0);
}

{
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    const { helper } = makeHelper({ profiles: abort, reactions: [] });
    await assert.rejects(() => helper(comments), (error) => error?.name === 'AbortError');
}

const loadStart = source.indexOf('async function loadComments()');
const refreshStart = source.indexOf('async function refreshComments()');
const submitStart = source.indexOf('async function submitHandler(');
assert.ok(loadStart >= 0 && refreshStart > loadStart && submitStart > refreshStart);
const loadBody = source.slice(loadStart, refreshStart);
const refreshBody = source.slice(refreshStart, submitStart);

for (const [name, body] of [['initial load', loadBody], ['refresh', refreshBody]]) {
    const primaryIndex = body.indexOf('await fetchComments(');
    const secondaryIndex = body.indexOf('await fetchCommentSecondaryData(');
    assert.ok(primaryIndex >= 0, `${name} must read comments as primary data`);
    assert.ok(secondaryIndex > primaryIndex, `${name} must load optional secondary data only after comments`);
}

console.log('PASS: FIX 30 comment secondary-read resilience');
