import { useLanguage } from '../../context/languageContext';
import { getToastTranslation } from '../../i18n/toastTranslations';
import ToastItem from './ToastItem';
import styles from './Toast.module.css';

function ToastContainer({ toasts, onDismiss }) {
    const { language } = useLanguage();
    const closeLabel = getToastTranslation(language, 'close') ?? 'Close notification';
    const notificationsLabel = getToastTranslation(language, 'notifications') ?? 'Notifications';

    return (
        <div className={styles.viewport} aria-label={notificationsLabel}>
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    closeLabel={closeLabel}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
}

export default ToastContainer;
