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

const migration = read(
    'supabase/migrations/20261006183000_heritage_rating_01.sql'
);

const service = read(
    'src/services/heritageRatingService.js'
);

const component = read(
    'src/components/heritage/HeritageRating.jsx'
);

const translations = read(
    'src/i18n/translations.js'
);

/* DATABASE */

expect(
    migration.includes('create table if not exists public.heritage_ratings'),
    'heritage_ratings table exists in migration',
);

expect(
    migration.includes('primary key (article_slug, user_id)'),
    'one rating per user per Heritage article is enforced',
);

expect(
    migration.includes('check (rating between 1 and 5)'),
    'rating is restricted to values 1 through 5',
);

expect(
    migration.includes(
        'alter table public.heritage_ratings enable row level security'
    ),
    'RLS is enabled for Heritage ratings',
);

expect(
    migration.includes('user_id = auth.uid()'),
    'rating writes are restricted to the current user',
);

expect(
    migration.includes('grant select on public.heritage_ratings to anon'),
    'rating totals are publicly readable',
);

/* SERVICE */

expect(
    service.includes(".from('heritage_ratings')"),
    'Heritage rating service uses heritage_ratings table',
);

expect(
    service.includes('.insert({'),
    'new ratings can be inserted',
);

expect(
    service.includes('.update({'),
    'existing ratings can be updated',
);

expect(
    service.includes(".eq('article_slug', articleSlug)") &&
    service.includes(".eq('user_id', userId)"),
    'rating updates target the current article and user',
);

expect(
    service.includes('average: count > 0 ? total / count : 0'),
    'average rating is calculated',
);

expect(
    service.includes('userRating: ownRating?.rating ?? 0'),
    'current user rating is restored',
);

/* COMPONENT */

expect(
    component.includes('const ratingValues = [1, 2, 3, 4, 5]'),
    'five-star rating scale is rendered',
);

expect(
    component.includes('const canRate = Boolean(user && isActive)'),
    'active authenticated users including admins can rate',
);

expect(
    component.includes('disabled={!canRate || saving || loading}'),
    'rating buttons respect auth/loading/saving state',
);

expect(
    component.includes('onClick={() => ratingHandler(value)}'),
    'star click triggers rating save',
);

expect(
    component.includes('{String.fromCharCode(9733)}'),
    'rating star glyph uses encoding-safe rendering',
);

expect(
    !component.includes('const copy ='),
    'Heritage rating component has no local hardcoded language object',
);

/* I18N */

const requiredKeys = [
    'heritageRatingTitle',
    'heritageRatingSignIn',
    'heritageRatingActiveOnly',
    'heritageRatingChoose',
    'heritageRatingYourRating',
    'heritageRatingLoadError',
    'heritageRatingSaveError',
];

for (const key of requiredKeys) {
    const matches = translations.match(
        new RegExp(`\\b${key}:`, 'g')
    ) ?? [];

    expect(
        matches.length === 3,
        `${key} exists in EN/BG/IT`,
    );
}

console.log('');
console.log('HERITAGE RATING 01: PASS');
console.log(
    '1-5 stars, one rating per user, insert/update, persistence, RLS and centralized EN/BG/IT UI are verified.'
);
