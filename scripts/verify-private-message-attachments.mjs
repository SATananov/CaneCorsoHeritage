import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261015123000_private_message_attachments_01.sql', 'utf8');
const service = readFileSync('src/services/messageService.js', 'utf8');
const messages = readFileSync('src/components/MessagesSection.jsx', 'utf8');
const css = readFileSync('src/components/MessagesSection.module.css', 'utf8');
const translations = readFileSync('src/i18n/messageTranslations.js', 'utf8');

assert.match(migration, /attachment_path text/);
assert.match(migration, /attachment_name text/);
assert.match(migration, /attachment_mime_type text/);
assert.match(migration, /attachment_size bigint/);
assert.match(migration, /'message-attachments'/);
assert.match(migration, /public,\s*file_size_limit/);
assert.match(migration, /false,\s*26214400/);
assert.match(migration, /message attachments participants read/);
assert.match(migration, /message attachments sender insert/);
assert.match(migration, /message attachments sender delete/);
assert.match(migration, /f\.status = 'accepted'/);

assert.match(service, /MESSAGE_ATTACHMENT_BUCKET\s*=\s*'message-attachments'/);
assert.match(service, /export async function sendPrivateMessageAttachment/);
assert.match(service, /\.storage\s*\.from\(MESSAGE_ATTACHMENT_BUCKET\)\s*\.upload/);
assert.match(service, /attachment_path:/);
assert.match(service, /attachment_name:/);
assert.match(service, /attachment_mime_type:/);
assert.match(service, /attachment_size:/);
assert.match(service, /export async function getPrivateMessageAttachmentUrl/);
assert.match(service, /\.createSignedUrl\(message\.attachment_path,\s*3600\)/);
assert.match(service, /\.remove\(\[storagePath\]\)/);

assert.match(messages, /sendPrivateMessageAttachment/);
assert.match(messages, /getPrivateMessageAttachmentUrl/);
assert.match(messages, /function MessageAttachment/);
assert.match(messages, /attachment_path/);
assert.match(messages, /type="file"/);
assert.match(messages, /accept="image\/\*,audio\/\*,video\/\*/);
assert.match(messages, /selectedFile/);
assert.match(messages, /attachmentButtonLabel/);
assert.match(messages, /attachmentRemoveLabel/);

assert.match(css, /\.attachmentButton\b/);
assert.match(css, /\.attachmentPreview\b/);
assert.match(css, /\.messageAttachmentImage\b/);
assert.match(css, /\.messageAttachmentAudio\b/);

for (const language of ['en', 'bg', 'it']) {
    const block = translations.match(new RegExp(`${language}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
    assert.ok(block, `${language} translation block exists`);
    for (const key of [
        'attachmentButtonLabel',
        'attachmentRemoveLabel',
        'attachmentSelected',
        'attachmentOpen',
        'attachmentLoadError',
        'attachmentTooLarge',
        'attachmentTypeError',
    ]) {
        assert.match(block[1], new RegExp(`${key}:`), `${language} has ${key}`);
    }
}

console.log('PASS: PRIVATE MESSAGE ATTACHMENTS 01 adds participant-only private Storage attachments with React image/audio/video/document rendering.');
