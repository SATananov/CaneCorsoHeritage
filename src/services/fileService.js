import { supabase } from '../lib/supabaseClient';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getFileMimeType(file) {
    if (file.type) {
        return file.type;
    }

    if (file.name.toLowerCase().endsWith('.txt')) {
        return 'text/plain';
    }

    if (file.name.toLowerCase().endsWith('.mp4')) {
        return 'video/mp4';
    }

    return '';
}

function validateFile(file) {
    const mimeType = getFileMimeType(file);
    const isAllowed = mimeType.startsWith('image/')
        || mimeType === 'video/mp4'
        || mimeType === 'text/plain';

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
            })
            .select()
            .single();

        if (metadataError) {
            await supabase.storage.from('user-files').remove([storagePath]);
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

export async function fetchCommunityFilesByUser(userId) {
    const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', userId)
        .eq('visibility', 'community')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Unable to load shared files.');
    }

    return addSignedUrls(data ?? []);
}

export async function updateUserFileVisibility(fileId, visibility) {
    const { error } = await supabase
        .from('user_files')
        .update({
            visibility,
            updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

    if (error) {
        throw new Error(error.message || 'Unable to update file visibility.');
    }
}

export async function syncStoryFilesVisibility(storyId, visibility) {
    const { error } = await supabase
        .from('user_files')
        .update({
            visibility,
            updated_at: new Date().toISOString(),
        })
        .eq('story_id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to update story file visibility.');
    }
}

export async function deleteUserFile(file) {
    const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_path]);

    if (storageError) {
        throw new Error(storageError.message || 'Unable to delete the stored file.');
    }

    const { error: metadataError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', file.id);

    if (metadataError) {
        throw new Error(metadataError.message || 'Unable to remove the file record.');
    }
}

export async function deleteStoryFiles(storyId) {
    const { data, error } = await supabase
        .from('user_files')
        .select('id, storage_path')
        .eq('story_id', storyId);

    if (error) {
        throw new Error(error.message || 'Unable to prepare story files for deletion.');
    }

    if (!data?.length) {
        return;
    }

    const paths = data.map((file) => file.storage_path);
    const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove(paths);

    if (storageError) {
        throw new Error(storageError.message || 'Unable to delete story files.');
    }

    const { error: metadataError } = await supabase
        .from('user_files')
        .delete()
        .eq('story_id', storyId);

    if (metadataError) {
        throw new Error(metadataError.message || 'Unable to delete story file records.');
    }
}
