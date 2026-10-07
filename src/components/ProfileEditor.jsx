import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getTranslation } from '../i18n/translations';
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
} from '../services/profileService';
import styles from './ProfileEditor.module.css';
import { notifyProfileRefresh } from '../services/profileRefresh';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

function ProfileEditor({
    profile,
    contact,
    currentEmail,
    onSaved,
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
    const [avatarFile, setAvatarFile] = useState(null);
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

        try {
            await updateOwnProfile(profile.id, {
                displayName,
                username: cleanUsername,
                bio,
            });

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
            }

            notifyProfileRefresh(profile.id);
            setMessage(t('updated'));
            setOpen(false);
            onSaved();
        } catch {
            setError(t('updateError'));
        } finally {
            setSaving(false);
        }
    }

    async function removeAvatarHandler() {
        setSaving(true);
        setMessage('');
        setError('');

        try {
            await removeProfileAvatar(profile.id, profile.avatar_path);
            notifyProfileRefresh(profile.id);
            setAvatarFile(null);
            setMessage(t('avatarRemoved'));
            onSaved();
        } catch {
            setError(t('removeError'));
        } finally {
            setSaving(false);
        }
    }

    // Translate load failures at render time without reloading editable data.
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
                        type="file"
                        name="avatar"
                        accept="image/*"
                        onChange={(event) => {
                            setAvatarFile(event.target.files?.[0] ?? null);
                        }}
                    />
                    <small>{t('avatarNote')}</small>
                </label>

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
                    {profile.avatar_path && (
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
