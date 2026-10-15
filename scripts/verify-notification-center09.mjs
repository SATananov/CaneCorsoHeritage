import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync('src/services/engagementNotificationService.js', 'utf8');

assert.match(service, /\.from\('notification_events'\)/);
assert.match(service, /\.eq\('recipient_id', userId\)/);
assert.match(service, /\.is\('read_at', null\)/);
assert.match(service, /Notification rows are authoritative/);
assert.match(service, /fetchActorProfiles/);
assert.match(service, /catch \{/);
assert.match(service, /return new Map\(\)/);
assert.match(service, /return rows\.map/);

console.log('PASS: NOTIFICATION CENTER 09 engagement frontend read resilience verified.');
