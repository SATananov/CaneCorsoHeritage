import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthContext from './AuthContext';

function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('user');
    const [accountStatus, setAccountStatus] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);
    const [roleError, setRoleError] = useState(false);
    const [passwordRecovery, setPasswordRecovery] = useState(null);

    useEffect(() => {
        let active = true;
        let roleRequestId = 0;
        let resolvedRoleUserId = null;

        async function loadRole(userId) {
            if (!active) {
                return;
            }

            const requestId = ++roleRequestId;

            if (!userId) {
                resolvedRoleUserId = null;
                if (active) {
                    setRole('user');
                    setAccountStatus(null);
                    setRoleError(false);
                    setRoleLoading(false);
                }
                return;
            }

            if (resolvedRoleUserId !== userId) {
                resolvedRoleUserId = null;
                setRole('user');
                setAccountStatus(null);
                setRoleError(false);
                setRoleLoading(true);
            }

            const { data, error } = await supabase
                .from('user_roles')
                .select('role,account_status')
                .eq('user_id', userId)
                .maybeSingle();

            if (!active || requestId !== roleRequestId) {
                return;
            }

            if (error) {
                resolvedRoleUserId = null;
                console.error('Unable to load account role.', error);
                setRole('user');
                setAccountStatus(null);
                setRoleError(true);
            } else {
                resolvedRoleUserId = data ? userId : null;
                setRole(data?.role ?? 'user');
                setAccountStatus(data?.account_status ?? null);
                setRoleError(false);
            }

            setRoleLoading(false);
        }

        const initialSessionRequestId = roleRequestId;
        supabase.auth.getSession().then(({ data, error }) => {
            if (!active || initialSessionRequestId !== roleRequestId) {
                return;
            }

            if (error) {
                console.error('Unable to restore the account session.', error);
            }

            const nextSession = data?.session ?? null;
            setSession(nextSession);
            setLoading(false);
            loadRole(nextSession?.user?.id ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
            if (!active) {
                return;
            }

            if (event === 'PASSWORD_RECOVERY') {
                setPasswordRecovery(true);
            } else if (event === 'INITIAL_SESSION') {
                setPasswordRecovery((current) => current === true);
            } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setPasswordRecovery(false);
            }

            setSession(nextSession);
            setLoading(false);
            loadRole(nextSession?.user?.id ?? null);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    async function login(email, password) {
        const normalizedEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function register(displayName, username, email, password) {
        const cleanUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();

        const { data: existingProfiles, error: usernameError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername)
            .limit(1);

        if (usernameError) {
            throw usernameError;
        }

        if (existingProfiles.length > 0) {
            throw new Error('Username already in use.');
        }

        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: {
                    display_name: displayName,
                    username: cleanUsername,
                },
            },
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function requestPasswordReset(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const redirectTo = `${window.location.origin}/update-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo,
        });

        if (error) {
            throw error;
        }
    }

    async function updatePassword(password) {
        const { data, error } = await supabase.auth.updateUser({
            password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function logout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }
    }

    const value = {
        session,
        user: session?.user ?? null,
        loading,
        role,
        accountStatus,
        roleLoading,
        roleError,
        passwordRecovery,
        isAdmin: role === 'admin',
        isActive: accountStatus === 'active',
        login,
        register,
        requestPasswordReset,
        updatePassword,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
