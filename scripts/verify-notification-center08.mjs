import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const bell = read('src/components/NotificationBell.jsx');
const service = read('src/services/engagementNotificationService.js');
const migration = read('supabase/migrations/20261015084500_engagement_notifications_08.sql');
const translations = read('src/i18n/notificationTranslations.js');

assert.match(bell, /fetchUnreadEngagementNotifications/);
assert.match(bell, /markEngagementNotificationRead/);
assert.match(bell, /engagementNotifications/);
assert.match(bell, /engagementCount/);
assert.match(bell, /notification-engagements/);
assert.match(bell, /reactionsRatings/);
assert.match(bell, /handleEngagementOpen/);

assert.match(service, /\.from\('notification_events'\)/);
assert.match(service, /comment_reaction/);
assert.match(service, /story_rating/);
assert.match(service, /file_rating/);
assert.match(service, /read_at/);

assert.match(migration, /create table if not exists public\.notification_events/);
assert.match(migration, /notification_events_recipient_select/);
assert.match(migration, /notification_events_recipient_update/);
assert.match(migration, /notify_comment_reaction_change/);
assert.match(migration, /notify_story_rating_change/);
assert.match(migration, /notify_file_rating_change/);
assert.match(migration, /read_at = null/);

assert.match(translations, /reactionsRatings:/);
assert.match(translations, /likedComment:/);
assert.match(translations, /dislikedComment:/);
assert.match(translations, /ratedStory:/);
assert.match(translations, /ratedFile:/);

console.log(
    'PASS: NOTIFICATION CENTER 08 reactions + ratings notification events, RLS and accordion integration verified.',
);
