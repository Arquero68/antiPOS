'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';
import { Menu, X } from 'lucide-react';

export default function Layout({ children }) {
    const { user, profile, loading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

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
            <div className={styles.mobileHeader}>
                <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <span className={styles.mobileLogo}>antiPOS</span>
            </div>
            <Sidebar user={user} profile={profile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
