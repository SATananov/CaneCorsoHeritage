import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
import { getAvatarTranslation } from '../i18n/avatarTranslations';
import { USG_AVATAR_PRESETS } from '../data/usgAvatarPresets';
import {
    PROFILE_COUNTRIES,
    getProfileCities,
} from '../data/profileLocations';
import {
    fetchOwnPrivateProfileDetails,
    removeProfileAvatar,
    saveOwnPrivateProfileDetails,
    saveProfilePublicContact,
    updateOwnProfile,
    uploadProfileAvatar,
    saveProfilePresetAvatar,
} from '../services/profileService';
import styles from './ProfileEditor.module.css';
import { notifyProfileRefresh } from '../services/profileRefresh';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

function ProfileEditor({
    profile,
    contact,
    currentEmail,
    onSaved,
    onUsernameChanged,
    requiredCompletion = false,
}) {
    const { language } = useLanguage();
    const t = useCallback(
        (key) => getTranslation(language, 'profileEditor', key),
        [language],
    );
    const ts = useCallback(
        (key) => getTranslation(language, 'systemUi', key),
        [language],
    );
    const ta = useCallback(
        (key) => getAvatarTranslation(language, key),
        [language],
    );
    const [open, setOpen] = useState(false);
    const [displayName, setDisplayName] = useState(profile.display_name || '');
    const [username, setUsername] = useState(profile.username || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const cityOptions = getProfileCities(country);
    const countryOptions = country && !PROFILE_COUNTRIES.includes(country)
        ? [country, ...PROFILE_COUNTRIES]
        : PROFILE_COUNTRIES;
    const visibleCityOptions = city && !cityOptions.includes(city)
        ? [city, ...cityOptions]
        : cityOptions;

    const countryChangeHandler = (event) => {
        setCountry(event.target.value);
        setCity('');
    };
    const [privateDetailsLoading, setPrivateDetailsLoading] = useState(true);
    const [publicEmail, setPublicEmail] = useState(contact?.email || currentEmail || '');
    const [showEmail, setShowEmail] = useState(Boolean(contact?.show_email));
    const currentPresetPath = profile.avatar_url?.startsWith('/avatars/') ? profile.avatar_url : '';
    const [avatarFile, setAvatarFile] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState(currentPresetPath);
    const avatarInputRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
useEffect(() => {
        const controller = new AbortController();

        async function loadPrivateDetails() {
            setPrivateDetailsLoading(true);
            setError('');
            setFirstName('');
            setLastName('');
            setCountry('');
            setCity('');
            setPhone('');

            try {
                const details = await fetchOwnPrivateProfileDetails(
                    profile.id,
                    { signal: controller.signal },
                );

                if (controller.signal.aborted) {
                    return;
                }

                setFirstName(details?.first_name || '');
                setLastName(details?.last_name || '');
                setCountry(details?.country || '');
                setCity(details?.city || '');
                setPhone(details?.phone || '');
            } catch (loadError) {
                if (!controller.signal.aborted && loadError.name !== 'AbortError') {
                    setError('loadPrivateError');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setPrivateDetailsLoading(false);
                }
            }
        }

        loadPrivateDetails();

        return () => controller.abort();
    }, [profile.id]);

    async function submitHandler(event) {
        event.preventDefault();

        const cleanUsername = username.trim().toLowerCase();

        if (!USERNAME_PATTERN.test(cleanUsername)) {
            setError(t('usernameInvalid'));
            return;
        }


        if (!firstName.trim()) {
            setError(t('firstRequired'));
            return;
        }

        if (!lastName.trim()) {
            setError(t('lastRequired'));
            return;
        }

        if (!country.trim()) {
            setError(t('countryRequired'));
            return;
        }

        if (!city.trim()) {
            setError(t('cityRequired'));
            return;
        }

        setSaving(true);
        setMessage('');
        setError('');

        let hasCommittedChanges = false;

        try {
            await updateOwnProfile(profile.id, {
                displayName,
                username: cleanUsername,
                bio,
            });
            hasCommittedChanges = true;

            await saveOwnPrivateProfileDetails(profile.id, {
                firstName,
                lastName,
                country,
                city,
                phone,
            });

            await saveProfilePublicContact(
                profile.id,
                publicEmail,
                showEmail,
            );

            if (avatarFile) {
                await uploadProfileAvatar(
                    profile.id,
                    avatarFile,
                    profile.avatar_path,
                );
            } else if (selectedPreset && selectedPreset !== currentPresetPath) {
                await saveProfilePresetAvatar(
                    profile.id,
                    selectedPreset,
                    profile.avatar_path,
                );
            }

            notifyProfileRefresh(profile.id);
            setMessage(t('updated'));
            setOpen(false);
            if (cleanUsername !== profile.username) {
                onUsernameChanged?.(cleanUsername);
            }
            onSaved({ partial: false });
        } catch {
            if (hasCommittedChanges) {
                notifyProfileRefresh(profile.id);
                setError(t('partialUpdate'));
                if (cleanUsername !== profile.username) {
                    onUsernameChanged?.(cleanUsername);
                }
                onSaved({ partial: true });
            } else {
                setError(t('updateError'));
            }
        } finally {
            setSaving(false);
        }
    }

    async function removeAvatarHandler() {
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const result = await removeProfileAvatar(profile.id, profile.avatar_path);
            notifyProfileRefresh(profile.id);
            setAvatarFile(null);
            setSelectedPreset('');
            if (avatarInputRef.current) {
                avatarInputRef.current.value = '';
            }
            setMessage(
                result?.cleanupPending
                    ? t('avatarRemovedCleanupPending')
                    : t('avatarRemoved'),
            );
            onSaved();
        } catch {
            setError(t('removeError'));
        } finally {
            setSaving(false);
        }
    }

    const errorMessage = error === 'loadPrivateError' ? t('loadPrivateError') : error;
    const editorOpen = requiredCompletion || open;

    if (!editorOpen) {
        return (
            <div className={styles.closed}>
                <button
                    className={styles.editButton}
                    type="button"
                    onClick={() => setOpen(true)}
                >
                    {t('edit')}
                </button>
                {message && <span className={styles.success}>{message}</span>}
                {errorMessage && <span className={styles.error}>{errorMessage}</span>}
            </div>
        );
    }

    return (
        <section className={styles.panel} aria-labelledby="profile-editor-title">
            <div className={styles.heading}>
                <div>
                    <p>{t('privateControls')}</p>
                    <h2 id="profile-editor-title">{t('edit')}</h2>
                </div>
                {!requiredCompletion && (
                    <button
                        className={styles.closeButton}
                        type="button"
                        onClick={() => setOpen(false)}
                    >
                        {ts('close')}
                    </button>
                )}
            </div>

            <form className={styles.form} onSubmit={submitHandler}>
                <label>
                    <span>{t('displayName')}</span>
                    <input
                        type="text"
                        name="displayName"
                        autoComplete="name"
                        value={displayName}
                        maxLength="80"
                        onChange={(event) => setDisplayName(event.target.value)}
                    />
                </label>

                <label>
                    <span>{t('publicUsername')}</span>
                    <div className={styles.usernameField}>
                        <span>@</span>
                        <input
                            type="text"
                            name="publicUsername"
                            autoComplete="nickname"
                            value={username}
                            maxLength="30"
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </div>
                </label>


                <label>
                    <span>{t('firstName')}</span>
                    <input
                        type="text"
                        name="firstName"
                        value={firstName}
                        maxLength="80"
                        autoComplete="given-name"
                        required
                        disabled={privateDetailsLoading}
                        onChange={(event) => setFirstName(event.target.value)}
                    />
                </label>

                <label>
                    <span>{t('lastName')}</span>
                    <input
                        type="text"
                        name="lastName"
                        value={lastName}
                        maxLength="80"
                        autoComplete="family-name"
                        required
                        disabled={privateDetailsLoading}
                        onChange={(event) => setLastName(event.target.value)}
                    />
                </label>

                <label>
                    <span>{t('country')}</span>
                    <select
                        name="country"
                        value={country}
                        autoComplete="country-name"
                        required
                        disabled={privateDetailsLoading}
                        onChange={countryChangeHandler}
                    >
                        <option value="">{ts('selectCountry')}</option>
                        {countryOptions.map((countryName) => (
                            <option key={countryName} value={countryName}>
                                {countryName}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>{t('city')}</span>
                    <select
                        name="city"
                        value={city}
                        autoComplete="address-level2"
                        required
                        disabled={privateDetailsLoading || !country}
                        onChange={(event) => setCity(event.target.value)}
                    >
                        <option value="">
                            {country ? ts('selectCity') : ts('selectCountryFirst')}
                        </option>
                        {visibleCityOptions.map((cityName) => (
                            <option key={cityName} value={cityName}>
                                {cityName}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>{t('phone')}</span>
                    <input
                        type="tel"
                        name="phone"
                        value={phone}
                        maxLength="40"
                        autoComplete="tel"
                        disabled={privateDetailsLoading}
                        onChange={(event) => setPhone(event.target.value)}
                    />
                    <small>{t('phoneNote')}</small>
                </label>

                <label className={styles.fullWidth}>
                    <span>{t('biography')}</span>
                    <textarea
                        name="bio"
                        autoComplete="off"
                        value={bio}
                        rows="4"
                        maxLength="600"
                        onChange={(event) => setBio(event.target.value)}
                    />
                </label>

                <label>
                    <span>{t('avatar')}</span>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        name="avatar"
                        accept="image/*"
                        onChange={(event) => {
                            const nextFile = event.target.files?.[0] ?? null;
                            setAvatarFile(nextFile);
                            if (nextFile) {
                                setSelectedPreset('');
                            }
                        }}
                    />
                    <small>{t('avatarNote')}</small>
                </label>

                <section className={styles.avatarLibrary} aria-labelledby="usg-avatar-library-title">
                    <div className={styles.avatarLibraryHeading}>
                        <strong id="usg-avatar-library-title">{ta('libraryTitle')}</strong>
                        <span>{ta('libraryHint')}</span>
                    </div>

                    {['natural', 'cropped'].map((group) => (
                        <div className={styles.avatarGroup} key={group}>
                            <p className={styles.avatarGroupTitle}>
                                {ta(group === 'natural' ? 'naturalGroup' : 'croppedGroup')}
                            </p>

                            <div className={styles.avatarGrid}>
                                {USG_AVATAR_PRESETS
                                    .filter((avatar) => avatar.group === group)
                                    .map((avatar) => {
                                        const isSelected = selectedPreset === avatar.path;

                                        return (
                                            <button
                                                className={[styles.avatarChoice, isSelected ? styles.avatarChoiceSelected : ''].filter(Boolean).join(' ')}
                                                type="button"
                                                key={avatar.id}
                                                aria-pressed={isSelected}
                                                title={ta(avatar.labelKey)}
                                                onClick={() => {
                                                    setSelectedPreset(avatar.path);
                                                    setAvatarFile(null);

                                                    if (avatarInputRef.current) {
                                                        avatarInputRef.current.value = '';
                                                    }
                                                }}
                                            >
                                                <img
                                                    className={styles.avatarImage}
                                                    src={avatar.path}
                                                    alt={ta(avatar.labelKey)}
                                                />
                                                <span>{ta(avatar.labelKey)}</span>
                                                {isSelected && (
                                                    <span
                                                        className={styles.avatarSelectedBadge}
                                                        aria-label={ta('selected')}
                                                    >
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </section>

                <label>
                    <span>{t('publicEmail')}</span>
                    <input
                        type="email"
                        name="publicEmail"
                        autoComplete="email"
                        value={publicEmail}
                        maxLength="320"
                        onChange={(event) => setPublicEmail(event.target.value)}
                    />
                    <small>{t('publicEmailNote')}</small>
                </label>

                <label className={`${styles.checkbox} ${styles.fullWidth}`}>
                    <input
                        type="checkbox"
                        name="showPublicEmail"
                        checked={showEmail}
                        onChange={(event) => setShowEmail(event.target.checked)}
                    />
                    <span>{t('showEmail')}</span>
                </label>

                {errorMessage && (
                    <p className={`${styles.feedback} ${styles.error}`} role="alert">
                        {errorMessage}
                    </p>
                )}

                {message && (
                    <p className={`${styles.feedback} ${styles.success}`} role="status">
                        {message}
                    </p>
                )}

                <div className={`${styles.actions} ${styles.fullWidth}`}>
                    {(profile.avatar_path || profile.avatar_url) && (
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            disabled={saving}
                            onClick={removeAvatarHandler}
                        >
                            {t('removeAvatar')}
                        </button>
                    )}

                    <button
                        className={styles.primaryButton}
                        type="submit"
                        disabled={saving || privateDetailsLoading}
                    >
                        {privateDetailsLoading ? t('loading') : saving ? t('saving') : t('save')}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default ProfileEditor;
