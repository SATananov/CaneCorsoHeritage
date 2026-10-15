import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/UserDetailsPage.jsx', 'utf8');

assert.ok(
    source.includes("import { Link, useLocation, useNavigate, useParams } from 'react-router';"),
    'useLocation import is present',
);

assert.ok(
    source.includes('const location = useLocation();'),
    'location hook is present',
);

assert.ok(
    source.includes(
        '`/members/${encodeURIComponent(profile.username)}${location.search}${location.hash}`',
    ),
    'canonical redirect preserves conversation query and private-messages hash',
);

assert.ok(
    source.includes('location.hash,')
    && source.includes('location.search,'),
    'redirect effect tracks search/hash',
);

console.log(
    'PASS: DIRECT CHAT ROUTE PRESERVE 03 keeps ?conversation=...#private-messages through canonical member redirect.',
);
