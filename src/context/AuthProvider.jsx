import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthContext from './AuthContext';

function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('user');
    const [accountStatus, setAccountStatus] = useState('active');
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        let active = true;
        let roleRequestId = 0;

        async function loadRole(userId) {
            if (!active) {
                return;
            }

            // Every auth update, including logout, invalidates earlier role reads.
            const requestId = ++roleRequestId;

            if (!userId) {
                if (active) {
                    setRole('user');
                    setAccountStatus('active');
                    setRoleLoading(false);
                }
                return;
            }

            if (active) {
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
                console.error('Unable to load account role.', error);
                setRole('user');
                setAccountStatus('active');
            } else {
                setRole(data?.role ?? 'user');
                setAccountStatus(data?.account_status ?? 'active');
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
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!active) {
                return;
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function register(displayName, username, email, password) {
        const cleanUsername = username.trim().toLowerCase();

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
            email,
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
        const redirectTo = `${window.location.origin}/update-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
