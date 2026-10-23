import { useMemo, useState } from 'react';
import { useLanguage } from '../context/languageContext';
import { getDuplicateUploadMessage } from '../i18n/duplicateUploadUi';
import { getOwnerFileEditUi } from '../i18n/ownerFileEditUi';
import { editOwnedUserFile } from '../services/fileService';
import styles from './OwnerFileEditModal.module.css';

function OwnerFileEditModal({ file, onClose, onSaved }) {
    const { language } = useLanguage();
    const ui = useMemo(() => getOwnerFileEditUi(language), [language]);
    const [fileName, setFileName] = useState(file?.file_name ?? '');
    const [visibility, setVisibility] = useState(file?.visibility ?? 'private');
    const [allowMemberDownload, setAllowMemberDownload] = useState(
        file?.allow_member_download === true,
    );
    const [replacement, setReplacement] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');


    if (!file) {
        return null;
    }

    async function saveHandler(event) {
        event.preventDefault();

        const trimmedName = fileName.trim();

        if (!trimmedName) {
            setError(ui.nameRequired);
            return;
        }

        setSaving(true);
        setError('');

        try {
            let updated;

            try {
                updated = await editOwnedUserFile(file, {
                    fileName: trimmedName,
                    visibility,
                    allowMemberDownload,
                    replacementFile: replacement,
                });
            } catch (saveError) {
                if (saveError?.code !== 'DUPLICATE_FILE') {
                    throw saveError;
                }

                const uploadAgain = globalThis.confirm?.(
                    getDuplicateUploadMessage(
                        language,
                        replacement?.name ?? trimmedName,
                        saveError.duplicate?.file_name,
                    ),
                ) === true;

                if (!uploadAgain) {
                    return;
                }

                updated = await editOwnedUserFile(file, {
                    fileName: trimmedName,
                    visibility,
                    allowMemberDownload,
                    replacementFile: replacement,
                    allowDuplicate: true,
                });
            }

            onSaved?.(updated);

            if (updated?.cleanupPending) {
                globalThis.alert?.(ui.cleanupWarning);
            }

            onClose?.();
        } catch {
            setError(ui.saveError);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className={styles.backdrop}
            role="presentation"
            onMouseDown={(event) => {
                if (!saving && event.currentTarget === event.target) {
                    onClose?.();
                }
            }}
        >
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="owner-file-edit-title"
            >
                <div className={styles.header}>
                    <div>
                        <p className={styles.kicker}>{ui.ownerOnly}</p>
                        <h2 id="owner-file-edit-title">{ui.title}</h2>
                    </div>
                    <button
                        className={styles.closeButton}
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label={ui.cancel}
                    >
                        ×
                    </button>
                </div>

                <form className={styles.form} onSubmit={saveHandler}>
                    <label className={styles.field}>
                        <span>{ui.fileName}</span>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(event) => setFileName(event.target.value)}
                            disabled={saving}
                        />
                    </label>

                    <label className={styles.field}>
                        <span>{ui.replaceFile}</span>
                        <input
                            type="file"
                            onChange={(event) => {
                                const nextFile = event.target.files?.[0] ?? null;

                                setReplacement(nextFile);

                                if (
                                    nextFile
                                    && fileName.trim() === (file.file_name ?? '').trim()
                                ) {
                                    setFileName(nextFile.name);
                                }
                            }}
                            disabled={saving}
                        />
                        <small>
                            {replacement
                                ? ui.replacementSelected.replace('{name}', replacement.name)
                                : ui.replaceHint}
                        </small>
                    </label>

                    <label className={styles.field}>
                        <span>{ui.visibility}</span>
                        <select
                            value={visibility}
                            onChange={(event) => setVisibility(event.target.value)}
                            disabled={saving || Boolean(file.story_id)}
                        >
                            <option value="private">{ui.private}</option>
                            <option value="community">{ui.community}</option>
                        </select>
                        {file.story_id && <small>{ui.storyVisibility}</small>}
                    </label>

                    <label className={styles.checkRow}>
                        <input
                            type="checkbox"
                            checked={allowMemberDownload}
                            onChange={(event) => setAllowMemberDownload(event.target.checked)}
                            disabled={saving}
                        />
                        <span>{ui.memberDownload}</span>
                    </label>

                    {replacement && visibility === 'community' && (
                        <div className={styles.notice}>{ui.reapprovalNotice}</div>
                    )}

                    {error && (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            className={styles.cancelButton}
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            {ui.cancel}
                        </button>
                        <button
                            className={styles.saveButton}
                            type="submit"
                            disabled={saving}
                        >
                            {saving ? ui.saving : ui.save}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default OwnerFileEditModal;
