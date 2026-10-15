import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const service = read('src/services/commentNotificationService.js');
const comments = read('src/components/CommentsSection.jsx');
const migration = read('supabase/migrations/20261015082000_comment_notification_reads_05.sql');

assert.match(bell, /markCommentNotificationRead/);
assert.match(bell, /handleCommentOpen\(item\.id\)/);
assert.match(bell, /#comment-\$\{item\.id\}/);
assert.match(bell, /\/my-files\$\{commentHash\}/);
assert.match(bell, /\/stories\/\$\{encodeURIComponent\(item\.target_id\)\}\$\{commentHash\}/);
assert.match(bell, /item\.id !== commentId/);

assert.match(service, /comment_notification_reads/);
assert.match(service, /readIds/);
assert.match(service, /markCommentNotificationRead/);
assert.doesNotMatch(service, /comment_notification_state/);

assert.match(comments, /id=\{`comment-\$\{comment\.id\}`\}/);
assert.match(comments, /window\.location\.hash/);
assert.match(comments, /scrollIntoView/);

assert.match(migration, /create table if not exists public\.comment_notification_reads/);
assert.match(migration, /primary key \(user_id, comment_id\)/);
assert.match(migration, /enable row level security/);

console.log('PASS: NOTIFICATION CENTER 05 exact-comment deep links and per-comment read state verified.');
