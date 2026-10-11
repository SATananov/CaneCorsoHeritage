import fs from 'node:fs';

const baseMigrationPath =
    'supabase/migrations/20261011133000_member_downloads.sql';

const rpcMigrationPath =
    'supabase/migrations/20261011135000_member_download_access.sql';

const servicePath = 'src/services/fileService.js';
const myFilesPath = 'src/pages/MyFilesPage.jsx';
const galleryPath = 'src/pages/GalleryPage.jsx';
const i18nPath = 'src/i18n/applicationUi.js';

const read = (path) => fs.readFileSync(path, 'utf8');

const baseMigration = read(baseMigrationPath);
const rpcMigration = read(rpcMigrationPath);
const service = read(servicePath);
const myFiles = read(myFilesPath);
const gallery = read(galleryPath);
const i18n = read(i18nPath);

let failures = 0;

function check(condition, message) {
    if (condition) {
        console.log(`PASS: ${message}`);
        return;
    }

    failures += 1;
    console.error(`FAIL: ${message}`);
}

check(
    /allow_member_download\s+boolean\s+not\s+null\s+default\s+false/i
        .test(baseMigration),
    'database column defaults member downloads to disabled',
);

check(
    service.includes('allowMemberDownload = false'),
    'file upload defaults download permission to false',
);

check(
    service.includes(
        'allow_member_download: Boolean(allowMemberDownload)',
    ),
    'upload metadata persists allow_member_download',
);

check(
    rpcMigration.includes(
        'create or replace function public.set_user_file_download_permission',
    ),
    'dedicated download-permission RPC exists',
);

check(
    rpcMigration.includes('security definer'),
    'download-permission RPC executes through a controlled security-definer path',
);

check(
    rpcMigration.includes('if auth.uid() is null then'),
    'download-permission RPC rejects unauthenticated callers',
);

check(
    rpcMigration.includes(
        'if not (public.is_active_member() or public.is_admin()) then',
    ),
    'download-permission RPC requires an active member or admin',
);

check(
    rpcMigration.includes('user_id = auth.uid()')
        && rpcMigration.includes('or public.is_admin()'),
    'download-permission RPC restricts writes to owner or admin',
);

check(
    rpcMigration.includes(
        'allow_member_download = p_allow_member_download',
    ),
    'RPC changes the member-download permission field',
);

check(
    !rpcMigration.includes('moderation_status =')
        && !rpcMigration.includes('visibility ='),
    'RPC does not alter moderation or visibility state',
);

check(
    service.includes(
        "supabase.rpc(",
    )
        && service.includes(
            "'set_user_file_download_permission'",
        ),
    'client permission mutation uses the dedicated RPC',
);

check(
    service.includes(
        'p_allow_member_download: Boolean(allowMemberDownload)',
    ),
    'client sends the requested permission value to the RPC',
);

check(
    service.includes('if (data !== true)'),
    'client fails closed when the RPC does not authorize exactly one update',
);

check(
    service.includes(
        'export async function createMemberDownloadUrl',
    ),
    'member download URL service exists',
);

check(
    service.includes(
        'metadata.allow_member_download !== true',
    ),
    'download service rejects non-owner members without explicit permission',
);

check(
    service.includes(
        'const isOwner = metadata.user_id === user.id',
    ),
    'file owner remains independently eligible to download',
);

check(
    service.includes('.createSignedUrl('),
    'download uses a signed URL',
);

check(
    /createSignedUrl\([\s\S]*?\b60\b[\s\S]*?download:/m
        .test(service),
    'download URL is short-lived and requests download disposition',
);

check(
    myFiles.includes('allowMemberDownload'),
    'My Files exposes upload-time member download permission',
);

check(
    myFiles.includes('downloadPermissionHandler'),
    'My Files allows permission changes after upload',
);

check(
    myFiles.includes(
        'file.allow_member_download === true',
    ),
    'My Files renders persisted permission state',
);

check(
    gallery.includes('const { user } = useAuth();'),
    'Gallery reads authentication state',
);

check(
    gallery.includes(
        'file.allow_member_download === true',
    ),
    'Gallery gates member download on explicit permission',
);

check(
    gallery.includes(
        'file.user_id === user.id',
    ),
    'Gallery preserves owner download eligibility',
);

check(
    gallery.includes(
        'createMemberDownloadUrl(file)',
    ),
    'Gallery download action uses the authorization-aware service',
);

check(
    gallery.includes(
        'className={styles.openFileLink}',
    ),
    'existing Open File action remains present',
);

check(
    gallery.includes(
        'className={styles.downloadFileLink}',
    ),
    'Download remains a separate Gallery action',
);

check(
    !/\{\s*!user\s*&&[\s\S]{0,200}downloadFileLink/.test(gallery),
    'Gallery does not render a download action specifically for guests',
);

const requiredKeys = [
    'allowMemberDownload:',
    'memberDownload:',
    'download:',
    'downloading:',
    'downloadError:',
    'downloadPermissionError:',
];

for (const key of requiredKeys) {
    const occurrences = i18n.split(key).length - 1;

    check(
        occurrences === 3,
        `${key.replace(':', '')} exists exactly once in EN/BG/IT`,
    );
}

if (failures > 0) {
    console.error(
        `\nMEMBER DOWNLOAD PERMISSIONS 01: FAIL (${failures} checks failed)`,
    );
    process.exit(1);
}

console.log('\nMEMBER DOWNLOAD PERMISSIONS 01: PASS');
console.log(
    'Visibility, moderation and member-download permission remain independent.',
);
