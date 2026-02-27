'use client';

import React, { useState, useEffect } from 'react';
import {
    Store, Mail, Download, Save, Trash2,
    Bell, Shield, Database, Loader2, ShieldAlert,
    User, Search, History
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';
import { logAction } from '@/lib/audit';

const SettingsView = () => {
    const { profile: userProfile } = useUser();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        storeName: '',
        ownerEmail: '',
        taxRate: '5',
        currencySymbol: '₱'
    });

    const [logs, setLogs] = useState([]);
    const [logLoading, setLogLoading] = useState(false);
    const [staff, setStaff] = useState([]);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        if (userProfile?.role === 'cashier') return; // Don't fetch for cashier
        fetchSettings();
        if (activeTab === 'audit') fetchLogs();
        if (activeTab === 'staff') fetchStaff();
    }, [activeTab, userProfile?.role]);

    if (userProfile?.role === 'cashier') {
        return (
            <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShieldAlert size={64} color="var(--error)" style={{ marginBottom: '24px', opacity: 0.5 }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Settings Restricted</h2>
                <p>Staff members cannot modify system configuration.</p>
            </div>
        );
    }

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                const sName = data.find(s => s.key === 'store_name')?.value || '';
                const oEmail = data.find(s => s.key === 'owner_email')?.value || '';
                const tRate = data.find(s => s.key === 'tax_rate')?.value || '5';
                const cSymbol = data.find(s => s.key === 'currency_symbol')?.value || '₱';
                setSettings({ storeName: sName, ownerEmail: oEmail, taxRate: tRate, currencySymbol: cSymbol });
            }
        } catch (err) {
            console.error('Settings fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLogLoading(true);
            // In a real app, we'd join with profiles, but for now we'll just fetch raw logs
            const { data } = await supabase
                .from('audit_logs')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(50);
            setLogs(data || []);
        } catch (err) {
            console.warn('Audit logs table might not exist yet.');
        } finally {
            setLogLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            setStaff(data || []);
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('settings').upsert([
                { key: 'store_name', value: settings.storeName },
                { key: 'owner_email', value: settings.ownerEmail },
                { key: 'tax_rate', value: settings.taxRate },
                { key: 'currency_symbol', value: settings.currencySymbol }
            ], { onConflict: 'key' });

            await logAction('UPDATE_SETTINGS', 'settings', 'global', {
                storeName: settings.storeName,
                ownerEmail: settings.ownerEmail,
                taxRate: settings.taxRate,
                currencySymbol: settings.currencySymbol
            });

            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleBackup = async () => {
        try {
            const { data: products } = await supabase.from('products').select('*');
            const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `antiPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            await logAction('DATABASE_BACKUP', 'database', 'all');
        } catch (err) {
            alert('Backup failed.');
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>System Settings</h1>
                    <p className={styles.subtitle}>Configure your POS environment and track system changes.</p>
                </div>
                {activeTab === 'general' && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="glass"
                        style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span style={{ fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                )}
            </header>

            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
                <button
                    onClick={() => setActiveTab('general')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'general' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'general' ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'staff' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'staff' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'staff' ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Staff Management
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'audit' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'audit' ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Audit Logs
                </button>
            </div>

            {activeTab === 'general' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
                    <div className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <User size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Profile Information</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Store Name</label>
                                <input
                                    className="glass"
                                    type="text"
                                    value={settings.storeName}
                                    onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.02)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Owner Email</label>
                                <input
                                    className="glass"
                                    type="email"
                                    value={settings.ownerEmail}
                                    onChange={e => setSettings({ ...settings, ownerEmail: e.target.value })}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.02)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tax Rate (%)</label>
                                    <input
                                        className="glass"
                                        type="number"
                                        value={settings.taxRate}
                                        onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.02)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Currency Symbol</label>
                                    <input
                                        className="glass"
                                        type="text"
                                        value={settings.currencySymbol}
                                        onChange={e => setSettings({ ...settings, currencySymbol: e.target.value })}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.02)', color: 'white' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Bell size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Notifications</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                'Sales alerts for all branches',
                                'Low stock notifications',
                                'New staff login alerts',
                                'Weekly summary reports'
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem' }}>{item}</span>
                                    <div style={{ width: '40px', height: '20px', background: (i < 2) ? 'var(--primary)' : 'rgba(255,255,255,0.1)', borderRadius: '10px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', right: (i < 2) ? '2px' : '22px', top: '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'all 0.2s' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Database size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Database & Backup</h3>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Last backup: Never. Exports are provided in JSON format.</p>
                        <button
                            onClick={handleBackup}
                            className="glass"
                            style={{ width: '100%', padding: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)' }}
                        >
                            JSON Backup
                        </button>
                        <button
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            className="glass"
                            style={{ width: '100%', padding: '10px', fontWeight: 600, marginTop: '8px', color: 'var(--error)', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                            Clear Local Cache
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ marginTop: '24px' }} className="glass">
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Activity History</h3>
                        <button className="glass" onClick={fetchLogs} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Refresh</button>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {logLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
                                Loading logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <History size={48} style={{ opacity: 0.1, margin: '0 auto 12px' }} />
                                No audit logs found. Make changes to see history.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '16px' }}>Date</th>
                                        <th style={{ padding: '16px' }}>User</th>
                                        <th style={{ padding: '16px' }}>Action</th>
                                        <th style={{ padding: '16px' }}>Entity</th>
                                        <th style={{ padding: '16px' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '16px' }}>{log.profiles?.full_name || 'System Staff'}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    background: log.action.includes('ERROR') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: log.action.includes('ERROR') ? 'var(--error)' : 'var(--primary)',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', textTransform: 'capitalize' }}>{log.entity_type || 'N/A'}</td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {JSON.stringify(log.details)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
