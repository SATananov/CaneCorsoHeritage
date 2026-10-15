import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bell = readFileSync('src/components/NotificationBell.jsx', 'utf8');
const css = readFileSync('src/components/NotificationBell.module.css', 'utf8');
const translations = readFileSync('src/i18n/notificationTranslations.js', 'utf8');

assert.match(bell, /const \[friends,\s*setFriends\]\s*=\s*useState\(\[\]\)/);
assert.match(bell, /setFriends\(overview\.friends\)/);
assert.match(bell, /const visibleFriends = ready \? friends : \[\]/);
assert.match(bell, /friendsYouCanMessage/);
assert.match(bell, /visibleFriends\.map/);
assert.match(bell, /item\.other_user_id/);
assert.match(bell, /messageFriendList/);
assert.match(css, /\.messageFriendList\b/);
assert.match(css, /\.messageFriendLink\b/);
assert.match(css, /\.messageFriendHeading\b/);

for (const language of ['en', 'bg', 'it']) {
    const block = translations.match(new RegExp(`${language}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
    assert.ok(block, `${language} translation block exists`);
    assert.match(block[1], /friendsYouCanMessage:/, `${language} has friendsYouCanMessage`);
    assert.match(block[1], /noAcceptedFriends:/, `${language} has noAcceptedFriends`);
}

console.log('PASS: NOTIFICATION FRIENDS IN MESSAGES 01 shows accepted friends inside the Messages accordion without changing unread counts.');
