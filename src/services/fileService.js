import { supabase } from '../lib/supabaseClient';

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
                return {
                    ...file,
                    url: '',
                };
            }

            return {
                ...file,
                url: data.signedUrl,
            };
        }),
    );
}

export async function uploadUserFiles(
    files,
    {
        storyId = null,
        visibility = 'private',
    } = {},
) {
    if (!files?.length) {
        return [];
    }

    const user = await getCurrentUser();
    const uploaded = [];

    for (const file of files) {
        const mimeType = validateFile(file);
        const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;

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
                moderation_status: visibility === 'community' ? 'pending' : 'approved',
                moderated_at: null,
                moderated_by: null,
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

    console.log('fetchMyFiles rows:', data);
    return addSignedUrls(data ?? []);
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

export async function fetchCommunityGalleryImages(options = {}) {
    let query = supabase
        .from('user_files')
        .select('*')
        .eq('visibility', 'community')
        .eq('moderation_status', 'approved')
        .like('mime_type', 'image/%')
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

    if (storageError) {
        throw new Error(storageError.message || 'File record was deleted, but the stored file could not be cleaned up.');
    }
}
