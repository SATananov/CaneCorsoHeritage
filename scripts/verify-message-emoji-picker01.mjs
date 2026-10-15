import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const messages = readFileSync('src/components/MessagesSection.jsx', 'utf8');
const css = readFileSync('src/components/MessagesSection.module.css', 'utf8');
const translations = readFileSync('src/i18n/messageTranslations.js', 'utf8');

assert.match(messages, /const EMOJI_OPTIONS\s*=\s*\[/, 'emoji options exist');
assert.match(messages, /const \[emojiOpen,\s*setEmojiOpen\]\s*=\s*useState\(false\)/, 'emoji picker state exists');
assert.match(messages, /function insertEmoji\(emoji\)/, 'emoji insertion handler exists');
assert.match(messages, /textareaRef/, 'textarea caret ref exists');
assert.match(messages, /emojiPickerRef/, 'picker outside-click ref exists');
assert.match(messages, /aria-label=\{t\('emojiButtonLabel'\)\}/, 'localized emoji button label exists');
assert.match(messages, /className=\{styles\.emojiPanel\}/, 'emoji panel is rendered');
assert.match(messages, /type="button"[\s\S]*?onClick=\{\(\) => insertEmoji\(emoji\)\}/, 'emoji choices do not submit the form');
assert.match(messages, /maxLength=\{2000\}/, 'existing message length limit remains');
assert.match(css, /\.emojiButton\b/, 'emoji trigger styles exist');
assert.match(css, /\.emojiPanel\b/, 'emoji panel styles exist');
assert.match(css, /\.emojiOption\b/, 'emoji option styles exist');

for (const language of ['en', 'bg', 'it']) {
    const blockMatch = translations.match(new RegExp(`${language}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
    assert.ok(blockMatch, `${language} translation block exists`);
    assert.match(blockMatch[1], /emojiButtonLabel:/, `${language} has emojiButtonLabel`);
    assert.match(blockMatch[1], /emojiPanelLabel:/, `${language} has emojiPanelLabel`);
}

console.log('PASS: MESSAGE EMOJI PICKER 01 adds a lightweight localized React emoji picker without database changes.');
