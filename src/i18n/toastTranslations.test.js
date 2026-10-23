import { describe, expect, it } from 'vitest';
import { toastTranslations } from './toastTranslations';

const languages = ['en', 'bg', 'it'];
const operationKeys = ['storySave', 'filesUpload', 'filesLoad'];
const errorOnlyKeys = ['storyPartial', 'storyRefresh'];
const copyKeys = [
    'loadingTitle',
    'loadingMessage',
    'slowMessage',
    'successTitle',
    'successMessage',
    'errorTitle',
    'errorMessage',
];

describe('toast translations', () => {
    it('keeps the same top-level keys in every language', () => {
        for (const language of languages) {
            expect(Object.keys(toastTranslations[language]).sort()).toEqual(
                Object.keys(toastTranslations.en).sort(),
            );
        }
    });

    it('keeps complete operation copy in every language', () => {
        for (const language of languages) {
            for (const operationKey of operationKeys) {
                for (const copyKey of copyKeys) {
                    expect(toastTranslations[language][operationKey][copyKey]).toBeTruthy();
                }
            }
        }
    });

    it('keeps error-only Story states translated in every language', () => {
        for (const language of languages) {
            for (const operationKey of errorOnlyKeys) {
                expect(toastTranslations[language][operationKey].errorTitle).toBeTruthy();
                expect(toastTranslations[language][operationKey].errorMessage).toBeTruthy();
            }
        }
    });

    it('provides a close label in every language', () => {
        for (const language of languages) {
            expect(toastTranslations[language].close).toBeTruthy();
        }
    });
});
