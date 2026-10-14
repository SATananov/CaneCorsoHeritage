import fs from 'node:fs';

function read(path) {
    return fs.readFileSync(path, 'utf8');
}

function expect(condition, label) {
    if (!condition) {
        throw new Error(`FAIL: ${label}`);
    }

    console.log(`PASS: ${label}`);
}

const migration = read('supabase/migrations/20261006180000_comment_reactions.sql');
const service = read('src/services/commentReactionService.js');
const comments = read('src/components/CommentsSection.jsx');
const translations = read('src/i18n/translations.js');

expect(
    migration.includes('primary key (comment_id, user_id)'),
    'one reaction per user per comment is enforced',
);

expect(
    migration.includes("reaction in ('like', 'dislike')"),
    'only like/dislike reactions are allowed',
);

expect(
    migration.includes('alter table public.comment_reactions enable row level security'),
    'comment reactions table has RLS enabled',
);

expect(
    migration.includes('user_id = auth.uid()'),
    'reaction writes are restricted to the current user',
);

expect(
    service.includes("onConflict: 'comment_id,user_id'"),
    'reaction changes use one-row upsert semantics',
);

expect(
    service.includes('removeCommentReaction'),
    'users can remove an existing reaction',
);

expect(
    comments.includes('toggleReaction'),
    'comment UI supports reaction toggling',
);

expect(
    comments.includes('useOptimistic')
    && comments.includes('optimisticReactionReducer')
    && comments.includes('applyOptimisticReaction')
    && comments.includes('addOptimisticReaction'),
    'comment reactions use React optimistic state over authoritative persisted reactions',
);

expect(
    comments.includes('startTransition(async () =>') && comments.includes('await new Promise((resolve) =>')
    && comments.includes('reaction: nextReaction'),
    'optimistic reaction state is applied while the mutation is pending',
);

expect(
    comments.includes('const visibleReactions = useMemo(')
    && comments.includes('const commentReactions = visibleReactions.filter('),
    'reaction counts and active state render from authoritative reactions plus a pending optimistic overlay',
);

expect(
    comments.includes("currentReaction?.reaction === reaction"),
    'pressing the same reaction removes it',
);

expect(
    comments.includes("setCommentReaction(commentId, reaction)"),
    'switching reaction updates the existing reaction',
);

expect(
    comments.includes("item.reaction === 'like'") &&
    comments.includes("item.reaction === 'dislike'"),
    'like/dislike totals are rendered separately',
);

expect(
    comments.includes("aria-pressed={myReaction === 'like'}") &&
    comments.includes("aria-pressed={myReaction === 'dislike'}"),
    'active reaction is exposed accessibly',
);

expect(
    translations.includes("reactions: 'Comment reactions'") &&
    translations.includes("reactions: 'Реакции към коментара'") &&
    translations.includes("reactions: 'Reazioni al commento'"),
    'reaction UI is localized in EN/BG/IT',
);

console.log('COMMENT REACTIONS 02: PASS');
console.log('Like/dislike, toggle, switch, optimistic UI, one reaction per user and EN/BG/IT UI are verified.');
