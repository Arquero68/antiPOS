'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  BarChart3,
  Package,
  Bell,
  Settings,
  LogOut,
  Ticket,
  FileText,
  Users,
  Truck,
  ShoppingBag,
  ClipboardList,
  History,
  Wallet
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { supabase } from '@/lib/supabase';

const Sidebar = ({ user, profile }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['admin', 'manager'] },
    { id: 'pos', icon: <Store size={20} />, label: 'POS Terminal', roles: ['admin', 'manager', 'cashier'] },
    { id: 'sales', icon: <BarChart3 size={20} />, label: 'Sales Reports', roles: ['admin', 'manager'] },
    { id: 'inventory', icon: <Package size={20} />, label: 'Inventory', roles: ['admin', 'manager'] },
    { id: 'customers', icon: <Users size={20} />, label: 'Customers', roles: ['admin', 'manager', 'cashier'] },
    { id: 'promotions', icon: <Ticket size={20} />, label: 'Promotions', roles: ['admin', 'manager'] },
    { id: 'suppliers', icon: <Truck size={20} />, label: 'Suppliers', roles: ['admin', 'manager'] },
    { id: 'closing', icon: <FileText size={20} />, label: 'Closing Reports', roles: ['admin', 'manager', 'cashier'] },
    { id: 'audit', icon: <History size={20} />, label: 'Audit Logs', roles: ['admin'] },
    { id: 'expenses', icon: <Wallet size={20} />, label: 'Expenses', roles: ['admin', 'manager'] },
    { id: 'procurement', icon: <ShoppingBag size={20} />, label: 'Purchasing', roles: ['admin', 'manager'] },
    { id: 'reconciliation', icon: <ClipboardList size={20} />, label: 'Stocktake', roles: ['admin', 'manager'] },
    { id: 'alerts', icon: <Bell size={20} />, label: 'Alerts', roles: ['admin', 'manager', 'cashier'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(profile?.role || 'cashier'));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.avatar} style={{ background: 'var(--primary)', color: 'white' }}>A</div>
        <span>antiPOS</span>
      </div>

      <nav className={styles.nav}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
            onClick={() => {
              if (item.id === 'pos') {
                router.push('/pos');
              } else {
                router.push(`/?tab=${item.id}`);
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <div className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => router.push('/?tab=settings')}>
            <Settings size={20} />
            <span>Settings</span>
          </div>
        )}

        <div className={styles.userProfile}>
          <div className={styles.avatar} style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName} style={{ fontSize: '0.81rem', fontWeight: 600 }}>{user?.email?.split('@')[0] || 'Staff'}</span>
            <span className={styles.userRole} style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{profile?.role || 'Staff'}</span>
          </div>
          <LogOut
            size={16}
            onClick={handleLogout}
            style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }}
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
