import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const help = readFileSync('src/components/HelpSection.jsx', 'utf8');
const translations = readFileSync('src/i18n/translations.js', 'utf8');
const css = readFileSync('src/App.css', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');

assert.ok(help.includes('const GUIDE_ITEMS = ['), 'guide item map exists');
assert.ok(help.includes('<details className="help-guide-item"'), 'guide uses accessible native details');
assert.ok(help.includes('guestTitle'), 'guest access guidance is rendered');
assert.ok(help.includes('memberTitle'), 'member access guidance is rendered');
assert.ok(help.includes('privacyNoteTitle'), 'privacy/access note is rendered');
assert.ok(help.includes("route: '/stories'"), 'Stories guide route exists');
assert.ok(help.includes("route: '/gallery'"), 'Gallery guide route exists');
assert.ok(help.includes("route: '/documents'"), 'Documents guide route exists');
assert.ok(help.includes("route: '/heritage'"), 'Heritage guide route exists');
assert.ok(help.includes("route: '/members'"), 'Members guide route exists');

assert.ok(translations.includes("guideTitle: 'How to use Cane Corso Heritage.'"), 'English guide translations exist');
assert.ok(translations.includes("guideTitle: 'Как се използва Cane Corso Heritage.'"), 'Bulgarian guide translations exist');
assert.ok(translations.includes("guideTitle: 'Come usare Cane Corso Heritage.'"), 'Italian guide translations exist');

assert.ok(css.includes('.help-guide {'), 'help guide styles exist');
assert.ok(css.includes('.help-guide-item'), 'accordion styles exist');
assert.ok(css.includes('.help-access-grid'), 'guest/member access styles exist');

assert.match(
    app,
    /<Route path="help\/:topic\?" element=\{<HelpPage \/>}/,
    'Help route remains directly public in the main route tree',
);

console.log('PASS: HELP GUIDE 01 provides a public EN/BG/IT platform guide for guests and members.');
