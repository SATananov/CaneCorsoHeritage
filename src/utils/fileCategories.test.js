import { describe, expect, it } from 'vitest';
import { isDocumentCategoryFile } from './fileCategories.js';

describe('isDocumentCategoryFile', () => {
    it('returns true for files stored in the documents category', () => {
        const file = { storage_path: 'user-id/documents/pedigree.pdf' };

        expect(isDocumentCategoryFile(file)).toBe(true);
    });

    it('returns false for files stored outside the documents category', () => {
        const file = { storage_path: 'user-id/images/cane-corso.jpg' };

        expect(isDocumentCategoryFile(file)).toBe(false);
    });

    it('returns false when the storage path is missing', () => {
        expect(isDocumentCategoryFile({})).toBe(false);
        expect(isDocumentCategoryFile(null)).toBe(false);
    });
});
