import { describe, expect, it } from 'vitest';
import {
    USG_AVATAR_PATHS,
    USG_AVATAR_PRESETS,
    isUsgAvatarPath,
} from './usgAvatarPresets';

describe('USG avatar presets', () => {
    it('contains twelve unique preset avatars', () => {
        expect(USG_AVATAR_PRESETS).toHaveLength(12);
        expect(new Set(USG_AVATAR_PATHS).size).toBe(12);
    });

    it('keeps six natural and six cropped variants', () => {
        expect(USG_AVATAR_PRESETS.filter((avatar) => avatar.group === 'natural')).toHaveLength(6);
        expect(USG_AVATAR_PRESETS.filter((avatar) => avatar.group === 'cropped')).toHaveLength(6);
    });

    it('accepts only registered preset paths', () => {
        expect(isUsgAvatarPath('/avatars/usg-natural-black-01.png')).toBe(true);
        expect(isUsgAvatarPath('/avatars/not-a-real-avatar.png')).toBe(false);
        expect(isUsgAvatarPath('../avatars/usg-natural-black-01.png')).toBe(false);
    });
});
