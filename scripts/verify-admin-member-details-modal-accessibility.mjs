import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const modal = read('src/components/admin/AdminMemberDetailsModal.jsx');

assert.match(modal, /role="dialog"/, 'Member details must keep dialog role');
assert.match(modal, /aria-modal="true"/, 'Member details must remain modal to assistive tech');
assert.match(
    modal,
    /aria-labelledby="admin-member-details-title"/,
    'Dialog must keep an accessible title relationship',
);

assert.match(
    modal,
    /event\.key === 'Escape'[\s\S]*onClose\(\)/,
    'Escape must close the member details dialog',
);

assert.match(
    modal,
    /closeButtonRef\.current\?\.focus\(\)/,
    'Dialog must move initial focus inside itself',
);

assert.match(
    modal,
    /previouslyFocusedRef\.current[\s\S]*\.focus\(\)/,
    'Dialog must restore focus on close',
);

assert.match(
    modal,
    /event\.key !== 'Tab'/,
    'Dialog must explicitly handle Tab navigation',
);

assert.match(
    modal,
    /event\.shiftKey && document\.activeElement === first/,
    'Shift+Tab must wrap from first to last focusable control',
);

assert.match(
    modal,
    /!event\.shiftKey && document\.activeElement === last/,
    'Tab must wrap from last to first focusable control',
);

assert.match(
    modal,
    /if \(event\.currentTarget === event\.target\)[\s\S]*onClose\(\)/,
    'Backdrop-only close behavior must remain intact',
);

console.log('ADMIN MEMBER DETAILS MODAL ACCESSIBILITY 01: PASS');