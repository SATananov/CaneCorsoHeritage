import fs from 'node:fs';

function read(path) {
    return fs.readFileSync(path, 'utf8');
}

function expect(condition, label) {
    if (!condition) {
        console.error(`FAIL: ${label}`);
        process.exitCode = 1;
        return;
    }

    console.log(`PASS: ${label}`);
}

const detailsHook = read('src/hooks/useStoryDetails.js');
const detailsPage = read('src/pages/StoryDetailsPage.jsx');
const storiesPreview = read('src/components/StoriesPreviewSection.jsx');
const catalogService = read('src/services/storyCatalogService.js');
const fileService = read('src/services/fileService.js');
const translations = read('src/i18n/translations.js');

expect(
    detailsHook.includes('const [attachmentsError, setAttachmentsError] = useState(false);')
    && detailsHook.includes('setAttachmentsError(true);')
    && detailsHook.includes('attachmentsError,'),
    'Story attachment failures are exposed separately from the main Story load',
);

expect(
    detailsPage.includes('attachmentsError')
    && detailsPage.includes("t('attachmentsLoadError')")
    && detailsPage.includes('role="alert"'),
    'Story Details surfaces attachment failures without hiding the loaded Story',
);

expect(
    translations.includes("attachmentsLoadError: 'The Story loaded, but its attachments could not be loaded.'")
    && translations.includes("attachmentsLoadError: 'Историята е заредена, но прикачените файлове не могат да бъдат заредени.'")
    && translations.includes("attachmentsLoadError: 'La Storia è stata caricata, ma non è stato possibile caricare gli allegati.'"),
    'attachment warning is localized in EN/BG/IT',
);

expect(
    translations.match(/catalogMetricsError:/g)?.length === 3,
    'catalog metrics warning is localized in EN/BG/IT',
);

expect(
    catalogService.includes('const ratingsAvailable = !ratingsResult.error;')
    && catalogService.includes('const commentsAvailable = !commentsResult.error;')
    && catalogService.includes('averageRating: ratingsAvailable ? 0 : null')
    && catalogService.includes('ratingCount: ratingsAvailable ? 0 : null')
    && catalogService.includes('commentCount: commentsAvailable ? 0 : null')
    && catalogService.includes('metricsWarning: !ratingsAvailable || !commentsAvailable'),
    'Story catalog preserves primary Stories and marks failed secondary metrics unavailable',
);

expect(
    storiesPreview.includes('enrichedStories.some((story) => story.metricsWarning)')
    && storiesPreview.includes("t('catalogMetricsError')")
    && storiesPreview.includes("story.averageRating == null ? '—'")
    && storiesPreview.includes("story.ratingCount == null ? '—'")
    && storiesPreview.includes("story.commentCount == null ? '—'"),
    'Story catalog surfaces degraded metrics without displaying false zero values',
);

expect(
    fileService.includes('Unable to create a secure link for')
    && !fileService.includes("url: '',"),
    'signed URL failures are no longer hidden as empty links',
);

if (process.exitCode) {
    process.exit(process.exitCode);
}

console.log('API ERROR SEMANTICS 01: PASS');
