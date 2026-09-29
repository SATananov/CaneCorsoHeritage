import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthContext from './AuthContext';

function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!active) {
                return;
            }

            if (error) {
                console.error('Unable to restore the Supabase session.', error);
            }

            setSession(data?.session ?? null);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoading(false);
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

    async function register(displayName, email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                },
            },
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
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
