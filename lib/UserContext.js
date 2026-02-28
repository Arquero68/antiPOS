'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    if (!supabase) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'white', flexDirection: 'column', gap: '16px', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: 'var(--error)' }}>Configuration Error</h1>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                    Supabase environment variables are not set. Please add them in Vercel settings.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    NEXT_PUBLIC_SUPABASE_URL<br/>
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                </p>
            </div>
        );
    }

    const fetchProfile = async (id) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            setProfile(data || { role: 'cashier' });
        } catch (err) {
            setProfile({ role: 'cashier' });
        }
    };

    useEffect(() => {
        const initSession = async () => {
            // Check for Developer Bypass first
            const isBypass = localStorage.getItem('dev_bypass') === 'true';
            if (isBypass) {
                setUser({ id: 'dev-user', email: 'dev@antipos.local' });
                setProfile({ id: 'dev-user', full_name: 'Developer Admin', role: 'admin' });
                setLoading(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await fetchProfile(session.user.id);
            }
            setLoading(false);
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Respect bypass during auth changes
            if (localStorage.getItem('dev_bypass') === 'true') return;

            setUser(session?.user || null);
            if (!session) {
                setProfile(null);
            } else {
                fetchProfile(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <UserContext.Provider value={{ user, profile, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
