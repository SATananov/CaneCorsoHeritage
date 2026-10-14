export function isDocumentCategoryFile(file) {
    const pathParts = String(file?.storage_path ?? '').split('/');
    return pathParts.length > 2 && pathParts[1] === 'documents';
}
