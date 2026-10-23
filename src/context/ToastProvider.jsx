import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ToastContext from './ToastContext';
import ToastContainer from '../components/toast/ToastContainer';
import { useLanguage } from './languageContext';
import { getToastTranslation } from '../i18n/toastTranslations';

const DEFAULT_DURATION = {
    success: 4200,
    error: 6800,
    info: 4800,
};

function ToastProvider({ children }) {
    const { language } = useLanguage();
    const [toasts, setToasts] = useState([]);
    const nextIdRef = useRef(0);
    const pendingRef = useRef(new Map());
    const dismissTimersRef = useRef(new Map());

    const getCopy = useCallback((key) => (
        getToastTranslation(language, key) ?? {}
    ), [language]);

    const clearDismissTimer = useCallback((id) => {
        const timer = dismissTimersRef.current.get(id);
        if (timer) {
            window.clearTimeout(timer);
            dismissTimersRef.current.delete(id);
        }
    }, []);

    const clearPending = useCallback((id) => {
        const pending = pendingRef.current.get(id);
        if (!pending) return;

        if (pending.showTimer) window.clearTimeout(pending.showTimer);
        if (pending.slowTimer) window.clearTimeout(pending.slowTimer);
        pendingRef.current.delete(id);
    }, []);

    const dismiss = useCallback((id) => {
        clearPending(id);
        clearDismissTimer(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, [clearDismissTimer, clearPending]);

    const scheduleDismiss = useCallback((id, duration) => {
        clearDismissTimer(id);

        const timer = window.setTimeout(() => {
            dismissTimersRef.current.delete(id);
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, duration);

        dismissTimersRef.current.set(id, timer);
    }, [clearDismissTimer]);

    const showResult = useCallback((id, type, key, options = {}) => {
        clearPending(id);
        const copy = getCopy(key);
        const duration = options.duration ?? DEFAULT_DURATION[type] ?? 4800;

        const nextToast = {
            id,
            type,
            title: options.title ?? copy[`${type}Title`] ?? '',
            message: options.message ?? copy[`${type}Message`] ?? '',
            duration,
        };

        setToasts((current) => {
            const exists = current.some((toast) => toast.id === id);
            return exists
                ? current.map((toast) => (toast.id === id ? nextToast : toast))
                : [...current.slice(-3), nextToast];
        });

        scheduleDismiss(id, duration);
    }, [clearPending, getCopy, scheduleDismiss]);

    const start = useCallback((key, options = {}) => {
        const id = `toast-${Date.now()}-${++nextIdRef.current}`;
        const delay = options.delay ?? 700;
        const slowAfter = options.slowAfter ?? 4500;
        const copy = getCopy(key);

        const showTimer = window.setTimeout(() => {
            setToasts((current) => [
                ...current.slice(-3),
                {
                    id,
                    type: 'loading',
                    title: options.title ?? copy.loadingTitle ?? '',
                    message: options.message ?? copy.loadingMessage ?? '',
                    duration: null,
                },
            ]);
        }, delay);

        const slowTimer = window.setTimeout(() => {
            setToasts((current) => current.map((toast) => (
                toast.id === id
                    ? {
                        ...toast,
                        message: options.slowMessage ?? copy.slowMessage ?? toast.message,
                    }
                    : toast
            )));
        }, delay + slowAfter);

        pendingRef.current.set(id, { showTimer, slowTimer });
        return id;
    }, [getCopy]);

    const success = useCallback((key, options = {}) => {
        const id = `toast-${Date.now()}-${++nextIdRef.current}`;
        showResult(id, 'success', key, options);
        return id;
    }, [showResult]);

    const error = useCallback((key, options = {}) => {
        const id = `toast-${Date.now()}-${++nextIdRef.current}`;
        showResult(id, 'error', key, options);
        return id;
    }, [showResult]);

    const info = useCallback((key, options = {}) => {
        const id = `toast-${Date.now()}-${++nextIdRef.current}`;
        showResult(id, 'info', key, options);
        return id;
    }, [showResult]);

    const resolve = useCallback((id, key, options = {}) => {
        showResult(id, 'success', key, options);
    }, [showResult]);

    const reject = useCallback((id, key, options = {}) => {
        showResult(id, 'error', key, options);
    }, [showResult]);

    useEffect(() => () => {
        for (const pending of pendingRef.current.values()) {
            if (pending.showTimer) window.clearTimeout(pending.showTimer);
            if (pending.slowTimer) window.clearTimeout(pending.slowTimer);
        }
        for (const timer of dismissTimersRef.current.values()) {
            window.clearTimeout(timer);
        }
        pendingRef.current.clear();
        dismissTimersRef.current.clear();
    }, []);

    const value = useMemo(() => ({
        start,
        success,
        error,
        info,
        resolve,
        reject,
        dismiss,
    }), [dismiss, error, info, reject, resolve, start, success]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export default ToastProvider;
