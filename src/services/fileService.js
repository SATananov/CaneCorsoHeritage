import { supabase } from '../lib/supabaseClient';
import { createFileFingerprint } from '../utils/fileFingerprint';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MIME_BY_EXTENSION = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.svg': 'image/svg+xml',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.opus': 'audio/opus',
    '.wma': 'audio/x-ms-wma',
    '.aif': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.rtf': 'application/rtf',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.odt': 'application/vnd.oasis.opendocument.text',
};

const DOCUMENT_MIME_TYPES = new Set([
    'application/json',
    'application/xml',
    'application/rtf',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
]);

function getFileExtension(fileName) {
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function getFileMimeType(file) {
    if (file.type) {
        return file.type;
    }

    return MIME_BY_EXTENSION[getFileExtension(file.name)] ?? '';
}

function validateFile(file) {
    const mimeType = getFileMimeType(file);
    const isAllowed = mimeType.startsWith('image/')
        || mimeType.startsWith('audio/')
        || mimeType.startsWith('text/')
        || mimeType === 'video/mp4'
        || DOCUMENT_MIME_TYPES.has(mimeType);

    if (!isAllowed) {
        throw new Error(`Unsupported file type: ${file.name}`);
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File is larger than 50 MB: ${file.name}`);
    }

    return mimeType;
}

function safeFileName(fileName) {
    return fileName
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'file';
}


async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error('You need to be signed in.');
    }

    return data.user;
}

async function addSignedUrls(files) {
    return Promise.all(
        files.map(async (file) => {
            const { data, error } = await supabase.storage
                .from('user-files')
                .createSignedUrl(file.storage_path, 3600);

            if (error) {
                throw new Error(
                    error.message
                    || `Unable to create a secure link for ${file.file_name || 'file'}.`,
                );
            }

            return {
                ...file,
                url: data.signedUrl,
            };
        }),
    );
}

async function fingerprintStoredUserFile(file) {
    const { data, error } = await supabase.storage
        .from('user-files')
        .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
        return null;
    }

    try {
        const response = await fetch(data.signedUrl);

        if (!response.ok) {
            return null;
        }

        return createFileFingerprint(await response.blob());
    } catch {
        return null;
    }
}

async function saveUserFileFingerprint(fileId, contentHash) {
    const { error } = await supabase
        .from('user_files')
        .update({ content_hash: contentHash })
        .eq('id', fileId);

    return !error;
}

async function findDuplicateUserFile(userId, contentHash, fileSize, excludeFileId = null) {
    let directQuery = supabase
        .from('user_files')
        .select('id,file_name,visibility,moderation_status,storage_path,file_size,content_hash')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .limit(1);

    if (excludeFileId) {
        directQuery = directQuery.neq('id', excludeFileId);
    }

    const { data: directMatch, error: directError } = await directQuery.maybeSingle();

    if (directError) {
        throw new Error(directError.message || 'Unable to check for duplicate files.');
    }

    if (directMatch) {
        return directMatch;
    }

    let legacyQuery = supabase
        .from('user_files')
        .select('id,file_name,visibility,moderation_status,storage_path,file_size,content_hash')
        .eq('user_id', userId)
        .eq('file_size', fileSize)
        .is('content_hash', null)
        .limit(25);

    if (excludeFileId) {
        legacyQuery = legacyQuery.neq('id', excludeFileId);
    }

    const { data: legacyFiles, error: legacyError } = await legacyQuery;

    if (legacyError) {
        throw new Error(legacyError.message || 'Unable to check older files for duplicates.');
    }

    for (const legacyFile of legacyFiles ?? []) {
        const legacyHash = await fingerprintStoredUserFile(legacyFile);

        if (!legacyHash) {
            continue;
        }

        await saveUserFileFingerprint(legacyFile.id, legacyHash);

        if (legacyHash === contentHash) {
            return {
                ...legacyFile,
                content_hash: legacyHash,
            };
        }
    }

    return null;
}

function duplicateUploadError(file, duplicate, contentHash) {
    const error = new Error('Duplicate file detected.');
    error.code = 'DUPLICATE_FILE';
    error.file = file;
    error.duplicate = duplicate;
    error.contentHash = contentHash;
    return error;
}

function ambiguousFileUpdateError() {
    const error = new Error(
        'Unable to confirm whether the file update was committed. Refresh before trying again; any replacement object was kept for safety.',
    );
    error.code = 'FILE_UPDATE_AMBIGUOUS';
    return error;
}

export async function uploadUserFiles(
    files,
    {
        storyId = null,
        visibility = 'private',
        allowMemberDownload = false,
        contentCategory = null,
        allowDuplicate = false,
    } = {},
) {
    if (!files?.length) {
        return [];
    }

    const user = await getCurrentUser();
    const uploaded = [];

    for (const file of files) {
        const mimeType = validateFile(file);
        const contentHash = typeof file.arrayBuffer === 'function'
            && globalThis.crypto?.subtle
            ? await createFileFingerprint(file)
            : null;

        if (contentHash && !allowDuplicate) {
            const duplicate = await findDuplicateUserFile(user.id, contentHash, file.size);

            if (duplicate) {
                throw duplicateUploadError(file, duplicate, contentHash);
            }
        }

        const categoryFolder = contentCategory === 'document' ? 'documents/' : '';
        const storagePath = `${user.id}/${categoryFolder}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
            .from('user-files')
            .upload(storagePath, file, {
                contentType: mimeType,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(uploadError.message || `Unable to upload ${file.name}.`);
        }

        const { data, error: metadataError } = await supabase
            .from('user_files')
            .insert({
                user_id: user.id,
                story_id: storyId,
                file_name: file.name,
                storage_path: storagePath,
                mime_type: mimeType,
                file_size: file.size,
                visibility,
                allow_member_download: Boolean(allowMemberDownload),
                moderation_status: visibility === 'community' ? 'pending' : 'approved',
                moderated_at: null,
                moderated_by: null,
                ...(contentHash ? { content_hash: contentHash } : {}),
            })
            .select()
            .single();

        if (metadataError) {
            const { error: cleanupError } = await supabase.storage
                .from('user-files')
                .remove([storagePath]);

            if (cleanupError) {
                throw new Error(
                    `${metadataError.message || `Unable to save ${file.name}.`} `
                    + `The uploaded file could not be cleaned up: ${cleanupError.message || 'unknown storage cleanup error'}.`,
                );
            }

            throw new Error(metadataError.message || `Unable to save ${file.name}.`);
        }

        uploaded.push(data);
    }

    return uploaded;
}

export async function fetchMyFiles(userId) {
    const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Unable to load your files.');
    }

    return addSignedUrls(data ?? []);
}

export async function editOwnedUserFile(
    file,
    {
        fileName,
        visibility,
        allowMemberDownload,
        replacementFile = null,
        allowDuplicate = false,
    } = {},
) {
    if (!file?.id) {
        throw new Error('A file is required.');
    }

    const user = await getCurrentUser();
    const { data: current, error: currentError } = await supabase
        .from('user_files')
        .select('*')
        .eq('id', file.id)
        .eq('user_id', user.id)
        .single();

    if (currentError || !current) {
        throw new Error(currentError?.message || 'Unable to load the owned file.');
    }

    const nextName = String(fileName ?? current.file_name ?? '').trim();

    if (!nextName) {
        throw new Error('File name is required.');
    }

    const nextVisibility = current.story_id
        ? current.visibility
        : visibility === 'community'
            ? 'community'
            : 'private';

    const visibilityChanged = nextVisibility !== current.visibility;

    if (!replacementFile && !visibilityChanged) {
        const { data: affected, error: metadataError } = await supabase.rpc(
            'owner_update_user_file_metadata',
            {
                target_file_id: current.id,
                target_file_name: nextName,
                target_allow_member_download: Boolean(allowMemberDownload),
            },
        );

        if (metadataError) {
            throw new Error(metadataError.message || 'Unable to update file metadata.');
        }

        const affectedRows = Number(Array.isArray(affected) ? affected[0] : affected);
        if (affectedRows !== 1) {
            throw new Error('Owner file metadata update did not affect exactly one row.');
        }

        const { data: refreshed, error: refreshError } = await supabase
            .from('user_files')
            .select('*')
            .eq('id', current.id)
            .eq('user_id', user.id)
            .single();

        if (refreshError || !refreshed) {
            throw ambiguousFileUpdateError();
        }

        return {
            ...refreshed,
            url: file.url ?? null,
            cleanupPending: false,
        };
    }

    let nextStoragePath = current.storage_path;
    let nextMimeType = current.mime_type;
    let nextFileSize = current.file_size;
    let nextContentHash = current.content_hash ?? null;
    let uploadedReplacementPath = null;
    let replacementSignedUrl = null;

    if (replacementFile) {
        nextMimeType = validateFile(replacementFile);
        nextFileSize = replacementFile.size;
        nextContentHash = typeof replacementFile.arrayBuffer === 'function'
            && globalThis.crypto?.subtle
            ? await createFileFingerprint(replacementFile)
            : null;

        if (nextContentHash && !allowDuplicate) {
            const duplicate = await findDuplicateUserFile(
                user.id,
                nextContentHash,
                replacementFile.size,
                current.id,
            );

            if (duplicate) {
                throw duplicateUploadError(replacementFile, duplicate, nextContentHash);
            }
        }

        const categoryFolder = current.storage_path?.includes('/documents/')
            ? 'documents/'
            : '';

        uploadedReplacementPath = `${user.id}/${categoryFolder}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(replacementFile.name)}`;

        const { error: uploadError } = await supabase.storage
            .from('user-files')
            .upload(uploadedReplacementPath, replacementFile, {
                contentType: nextMimeType,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(uploadError.message || 'Unable to upload replacement file.');
        }

        const { data: signedData, error: signedError } = await supabase.storage
            .from('user-files')
            .createSignedUrl(uploadedReplacementPath, 3600);

        if (signedError || !signedData?.signedUrl) {
            const { error: cleanupError } = await supabase.storage
                .from('user-files')
                .remove([uploadedReplacementPath]);

            const message = signedError?.message
                || 'Unable to create a secure link for the replacement file.';

            if (cleanupError) {
                throw new Error(
                    `${message} The uploaded replacement could not be cleaned up: ${cleanupError.message || 'unknown storage cleanup error'}.`,
                );
            }

            throw new Error(message);
        }

        replacementSignedUrl = signedData.signedUrl;
        nextStoragePath = uploadedReplacementPath;
    }

    const moderationStatus = replacementFile || visibilityChanged
        ? nextVisibility === 'community' ? 'pending' : 'approved'
        : current.moderation_status;

    const patch = {
        file_name: nextName,
        storage_path: nextStoragePath,
        mime_type: nextMimeType,
        file_size: nextFileSize,
        visibility: nextVisibility,
        allow_member_download: Boolean(allowMemberDownload),
        moderation_status: moderationStatus,
        moderated_at: replacementFile || visibilityChanged ? null : current.moderated_at,
        moderated_by: replacementFile || visibilityChanged ? null : current.moderated_by,
        updated_at: new Date().toISOString(),
        content_hash: nextContentHash,
    };

    const { data: updated, error: updateError } = await supabase
        .from('user_files')
        .update(patch)
        .eq('id', current.id)
        .eq('user_id', user.id)
        .select()
        .single();

    let committed = updated;

    if (updateError || !updated) {
        if (!uploadedReplacementPath) {
            throw new Error(updateError?.message || 'Unable to update the file.');
        }

        const { data: reconciled, error: reconciliationError } = await supabase
            .from('user_files')
            .select('*')
            .eq('id', current.id)
            .eq('user_id', user.id)
            .single();

        if (!reconciliationError && reconciled?.storage_path === uploadedReplacementPath) {
            committed = reconciled;
        } else {
            throw ambiguousFileUpdateError();
        }
    }

    let cleanupPending = false;

    if (
        replacementFile
        && current.storage_path
        && current.storage_path !== nextStoragePath
    ) {
        const { error: cleanupError } = await supabase.storage
            .from('user-files')
            .remove([current.storage_path]);

        cleanupPending = Boolean(cleanupError);
    }

    return {
        ...committed,
        url: replacementFile
            ? replacementSignedUrl
            : file.url ?? null,
        cleanupPending,
    };
}

export async function fetchStoryFiles(storyId) {
    const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error(error.message || 'Unable to load story files.');
    }

    return addSignedUrls(data ?? []);
}

export async function enrichCommunityMediaWithMetrics(files, options = {}) {
    const safeFiles = Array.isArray(files) ? files : [];
    const ids = safeFiles.map((file) => file?.id).filter(Boolean);

    if (ids.length === 0) {
        return safeFiles.map((file) => ({
            ...file,
            averageRating: 0,
            ratingCount: 0,
            commentCount: 0,
        }));
    }

    let ratingsQuery = supabase
        .from('file_ratings')
        .select('file_id,rating')
        .in('file_id', ids);

    let commentsQuery = supabase
        .from('comments')
        .select('target_id')
        .eq('target_type', 'file')
        .in('target_id', ids);

    if (options.signal) {
        ratingsQuery = ratingsQuery.abortSignal(options.signal);
        commentsQuery = commentsQuery.abortSignal(options.signal);
    }

    const [ratingsResult, commentsResult] = await Promise.all([
        ratingsQuery,
        commentsQuery,
    ]);

    const ratingStats = new Map();
    const commentCounts = new Map();
    const ratingsAvailable = !ratingsResult.error;
    const commentsAvailable = !commentsResult.error;

    if (ratingsAvailable) {
        for (const row of ratingsResult.data ?? []) {
            const current = ratingStats.get(row.file_id) ?? { total: 0, count: 0 };
            current.total += Number(row.rating ?? 0);
            current.count += 1;
            ratingStats.set(row.file_id, current);
        }
    }

    if (commentsAvailable) {
        for (const row of commentsResult.data ?? []) {
            commentCounts.set(row.target_id, (commentCounts.get(row.target_id) ?? 0) + 1);
        }
    }

    return safeFiles.map((file) => {
        const rating = ratingsAvailable
            ? ratingStats.get(file.id) ?? { total: 0, count: 0 }
            : null;

        return {
            ...file,
            averageRating: ratingsAvailable
                ? rating.count > 0
                    ? rating.total / rating.count
                    : 0
                : null,
            ratingCount: ratingsAvailable ? rating.count : null,
            commentCount: commentsAvailable
                ? commentCounts.get(file.id) ?? 0
                : null,
            metricsWarning: !ratingsAvailable || !commentsAvailable,
        };
    });
}
export async function fetchCommunityMediaFiles(options = {}) {
    let query = supabase
        .from('user_files')
        .select('*')
        .eq('visibility', 'community')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load community media.');
    }

    return addSignedUrls(data ?? []);
}
export async function fetchCommunityGalleryImages(options = {}) {
    let query = supabase
        .from('user_files')
        .select('*')
        .eq('visibility', 'community')
        .eq('moderation_status', 'approved')
        .like('mime_type', 'image/%')
        .not('storage_path', 'like', '%/documents/%')
        .order('created_at', { ascending: false });

    if (options.signal) {
        query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message || 'Unable to load gallery images.');
    }

    return addSignedUrls(data ?? []);
}
export async function fetchCommunityFilesByUser(userId) {
    const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', userId)
        .eq('visibility', 'community')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Unable to load shared files.');
    }

    return addSignedUrls(data ?? []);
}

export async function updateUserFileVisibility(fileId, visibility) {
    const { count, error } = await supabase
        .from('user_files')
        .update({
            visibility,
            moderation_status: visibility === 'community' ? 'pending' : 'approved',
            moderated_at: null,
            moderated_by: null,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', fileId);

    if (error) {
        throw new Error(error.message || 'Unable to update file visibility.');
    }

    if (count !== 1) {
        throw new Error('File visibility update did not affect exactly one row.');
    }
}

export async function createMemberDownloadUrl(file) {
    if (!file?.id) {
        throw new Error('A file is required for download.');
    }

    const user = await getCurrentUser();

    const { data: metadata, error: metadataError } = await supabase
        .from('user_files')
        .select('id,user_id,file_name,storage_path,allow_member_download')
        .eq('id', file.id)
        .single();

    if (metadataError || !metadata) {
        throw new Error(
            metadataError?.message
            || 'Unable to verify file download permission.',
        );
    }

    const isOwner = metadata.user_id === user.id;

    if (!isOwner && metadata.allow_member_download !== true) {
        throw new Error('Member download is not enabled for this file.');
    }

    const { data, error } = await supabase.storage
        .from('user-files')
        .createSignedUrl(
            metadata.storage_path,
            60,
            {
                download: metadata.file_name || file.file_name || true,
            },
        );

    if (error || !data?.signedUrl) {
        throw new Error(
            error?.message
            || 'Unable to create download link.',
        );
    }

    return data.signedUrl;
}
export async function updateUserFileDownloadPermission(fileId, allowMemberDownload) {
    await getCurrentUser();

    const { data, error } = await supabase.rpc(
        'set_user_file_download_permission',
        {
            p_file_id: fileId,
            p_allow_member_download: Boolean(allowMemberDownload),
        },
    );

    if (error) {
        throw new Error(error.message || 'Unable to update file download permission.');
    }

    if (data !== true) {
        throw new Error('File download permission update was not authorized.');
    }
}
export async function syncStoryFilesVisibility(storyId, visibility) {
    const { error } = await supabase
        .from('user_files')
        .update({
            visibility,
            moderation_status: visibility === 'community' ? 'pending' : 'approved',
            moderated_at: null,
            moderated_by: null,
            updated_at: new Date().toISOString(),
        })
        .eq('story_id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to update story file visibility.');
    }
}

export async function deleteUserFile(file) {
    const { count: metadataCount, error: metadataError } = await supabase
        .from('user_files')
        .delete({ count: 'exact' })
        .eq('id', file.id);

    if (metadataError) {
        throw new Error(metadataError.message || 'Unable to remove the file record.');
    }

    if (metadataCount !== 1) {
        throw new Error('File deletion did not affect exactly one row.');
    }

    const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_path]);

    return {
        deleted: true,
        cleanupPending: Boolean(storageError),
        cleanupError: storageError?.message || null,
    };
}
