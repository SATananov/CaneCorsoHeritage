const listeners = new Set();

// Invalidate mounted profile UI without storing profile data globally.
export function notifyProfileRefresh(userId) {
    for (const subscription of listeners) {
        if (subscription.userId === userId) subscription.listener();
    }
}

export function subscribeProfileRefresh(userId, listener) {
    const subscription = { userId, listener };
    listeners.add(subscription);
    return () => listeners.delete(subscription);
}
