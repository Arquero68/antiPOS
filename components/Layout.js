'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout({ children }) {
    const { user, profile, loading } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 600 }}>antiPOS Security</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '8px' }}>Verifying Session...</div>
                </div>
            </div>
        );
    }

    if (pathname === '/login') return <>{children}</>;

    return (
        <div className={styles.layout}>
            <Sidebar user={user} profile={profile} />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
