import { describe, expect, it } from 'vitest';
import { getPageTitle } from './pageTitles';

describe('getPageTitle', () => {
    it('returns the dedicated English home title', () => {
        expect(getPageTitle('en', '/')).toBe(
            'Cane Corso Heritage | USG - Unico Suo Genere'
        );
    });

    it('localizes a public route and appends the Bulgarian brand title', () => {
        expect(getPageTitle('bg', '/stories')).toBe(
            'Истории | Кане Корсо Наследство'
        );
    });

    it('uses the article title for an Italian Heritage detail route', () => {
        expect(getPageTitle('it', '/heritage/history-of-the-cane-corso')).toBe(
            'Articolo del Patrimonio | Patrimonio Cane Corso'
        );
    });

    it('treats the legacy users route as the members catalog', () => {
        expect(getPageTitle('en', '/users')).toBe(
            'Members | Cane Corso Heritage'
        );
    });

    it('uses the member detail title for an individual member route', () => {
        expect(getPageTitle('en', '/members/example-user')).toBe(
            'Member | Cane Corso Heritage'
        );
    });

    it('returns the localized not-found title for an unknown route', () => {
        expect(getPageTitle('bg', '/route-that-does-not-exist')).toBe(
            'Страницата не е намерена | Кане Корсо Наследство'
        );
    });

    it('falls back to English when the requested language is unsupported', () => {
        expect(getPageTitle('de', '/gallery')).toBe(
            'Gallery | Cane Corso Heritage'
        );
    });
});
