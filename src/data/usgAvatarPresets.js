export const USG_AVATAR_PRESETS = [
    { id: 'natural-black', group: 'natural', labelKey: 'naturalBlack', path: '/avatars/usg-natural-black-01.png' },
    { id: 'natural-gray', group: 'natural', labelKey: 'naturalGray', path: '/avatars/usg-natural-gray-01.png' },
    { id: 'natural-brindle', group: 'natural', labelKey: 'naturalBrindle', path: '/avatars/usg-natural-brindle-01.png' },
    { id: 'natural-fawn', group: 'natural', labelKey: 'naturalFawn', path: '/avatars/usg-natural-fawn-01.png' },
    { id: 'natural-dark', group: 'natural', labelKey: 'naturalDark', path: '/avatars/usg-natural-dark-01.png' },
    { id: 'natural-black-gold', group: 'natural', labelKey: 'naturalBlackGold', path: '/avatars/usg-natural-black-gold-01.png' },
    { id: 'cropped-black', group: 'cropped', labelKey: 'croppedBlack', path: '/avatars/usg-cropped-black-01.png' },
    { id: 'cropped-gray', group: 'cropped', labelKey: 'croppedGray', path: '/avatars/usg-cropped-gray-01.png' },
    { id: 'cropped-brindle', group: 'cropped', labelKey: 'croppedBrindle', path: '/avatars/usg-cropped-brindle-01.png' },
    { id: 'cropped-fawn', group: 'cropped', labelKey: 'croppedFawn', path: '/avatars/usg-cropped-fawn-01.png' },
    { id: 'cropped-black-white', group: 'cropped', labelKey: 'croppedBlackWhite', path: '/avatars/usg-cropped-black-white-01.png' },
    { id: 'cropped-gray-laurel', group: 'cropped', labelKey: 'croppedGrayLaurel', path: '/avatars/usg-cropped-gray-laurel-01.png' },
];

export const USG_AVATAR_PATHS = USG_AVATAR_PRESETS.map((avatar) => avatar.path);

export function isUsgAvatarPath(value) {
    return typeof value === 'string' && USG_AVATAR_PATHS.includes(value);
}
