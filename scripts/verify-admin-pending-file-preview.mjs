import fs from 'node:fs';

const adminPage = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');
const pendingSection = fs.readFileSync('src/components/admin/AdminPendingSection.jsx', 'utf8');
const storagePolicy = fs.readFileSync(
    'supabase/migrations/20261014161500_admin_user_files_storage_read.sql',
    'utf8',
);

const checks = [
    [
        adminPage.includes('addFileSignedUrls(nextData.pendingFiles ?? [])')
            && adminPage.includes('pendingFiles: pendingFilesWithUrls'),
        'Pending moderation files receive signed preview URLs',
    ],
    [
        pendingSection.includes('className={styles.fileOpenLink}')
            && pendingSection.includes('href={file.url}')
            && pendingSection.includes('target="_blank"')
            && pendingSection.includes('rel="noopener noreferrer"'),
        'Pending moderation filenames open signed files safely in a new tab',
    ],
    [
        storagePolicy.includes('for select')
            && storagePolicy.includes("bucket_id = 'user-files'")
            && storagePolicy.includes('public.is_admin()'),
        'Storage RLS lets authenticated admins read user-files for moderation preview',
    ],
];

let failed = false;
for (const [passed, label] of checks) {
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
    if (!passed) failed = true;
}
if (failed) process.exit(1);
