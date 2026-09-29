import { useState } from 'react';
import {
    removeProfileAvatar,
    saveProfilePublicContact,
    updateOwnProfile,
    uploadProfileAvatar,
} from '../services/profileService';
import styles from './ProfileEditor.module.css';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

function ProfileEditor({
    profile,
    contact,
    currentEmail,
    onSaved,
}) {
    const [open, setOpen] = useState(false);
    const [displayName, setDisplayName] = useState(profile.display_name || '');
    const [username, setUsername] = useState(profile.username || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [publicEmail, setPublicEmail] = useState(contact?.email || currentEmail || '');
    const [showEmail, setShowEmail] = useState(Boolean(contact?.show_email));
    const [avatarFile, setAvatarFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function submitHandler(event) {
        event.preventDefault();

        const cleanUsername = username.trim().toLowerCase();

        if (!USERNAME_PATTERN.test(cleanUsername)) {
            setError('Username must be 3–30 characters using letters, numbers, dot, dash or underscore.');
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

            setMessage('Profile updated.');
            setOpen(false);
            onSaved();
        } catch (saveError) {
            setError(saveError.message || 'Unable to update your profile.');
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
            setAvatarFile(null);
            setMessage('Avatar removed.');
            onSaved();
        } catch (removeError) {
            setError(removeError.message || 'Unable to remove avatar.');
        } finally {
            setSaving(false);
        }
    }

    if (!open) {
        return (
            <div className={styles.closed}>
                <button
                    className={styles.editButton}
                    type="button"
                    onClick={() => setOpen(true)}
                >
                    Edit my profile
                </button>
                {message && <span className={styles.success}>{message}</span>}
                {error && <span className={styles.error}>{error}</span>}
            </div>
        );
    }

    return (
        <section className={styles.panel} aria-labelledby="profile-editor-title">
            <div className={styles.heading}>
                <div>
                    <p>Private profile controls</p>
                    <h2 id="profile-editor-title">Edit my profile</h2>
                </div>
                <button
                    className={styles.closeButton}
                    type="button"
                    onClick={() => setOpen(false)}
                >
                    Close
                </button>
            </div>

            <form className={styles.form} onSubmit={submitHandler}>
                <label>
                    <span>Display name</span>
                    <input
                        type="text"
                        value={displayName}
                        maxLength="80"
                        onChange={(event) => setDisplayName(event.target.value)}
                    />
                </label>

                <label>
                    <span>Public username</span>
                    <div className={styles.usernameField}>
                        <span>@</span>
                        <input
                            type="text"
                            value={username}
                            maxLength="30"
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </div>
                </label>

                <label className={styles.fullWidth}>
                    <span>Public biography</span>
                    <textarea
                        value={bio}
                        rows="4"
                        maxLength="600"
                        onChange={(event) => setBio(event.target.value)}
                    />
                </label>

                <label>
                    <span>Avatar image</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                            setAvatarFile(event.target.files?.[0] ?? null);
                        }}
                    />
                    <small>Image only · up to 5 MB</small>
                </label>

                <label>
                    <span>Public contact email</span>
                    <input
                        type="email"
                        value={publicEmail}
                        maxLength="320"
                        onChange={(event) => setPublicEmail(event.target.value)}
                    />
                    <small>This stays private unless you enable the checkbox below.</small>
                </label>

                <label className={`${styles.checkbox} ${styles.fullWidth}`}>
                    <input
                        type="checkbox"
                        checked={showEmail}
                        onChange={(event) => setShowEmail(event.target.checked)}
                    />
                    <span>Show this email publicly on my member profile</span>
                </label>

                {error && (
                    <p className={`${styles.feedback} ${styles.error}`} role="alert">
                        {error}
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
                            Remove avatar
                        </button>
                    )}

                    <button
                        className={styles.primaryButton}
                        type="submit"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save profile'}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default ProfileEditor;
