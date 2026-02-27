'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, RefreshCw, ShoppingCart, Loader2, CheckCircle } from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

const AlertsView = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();

        const channel = supabase
            .channel('inventory-alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchAlerts())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('products')
                .select('id, name, stock_quantity, low_stock_threshold, emoji');

            if (data) {
                const lowStock = data.filter(p =>
                    p.stock_quantity <= (p.low_stock_threshold || 10)
                ).sort((a, b) => a.stock_quantity - b.stock_quantity);
                setAlerts(lowStock);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Inventory Alerts</h1>
                    <p className={styles.subtitle}>Items currently below their restocking threshold.</p>
                </div>
                <button onClick={fetchAlerts} className="glass" style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </header>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 20px' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Checking inventory levels...</p>
                </div>
            ) : alerts.length === 0 ? (
                <div className="glass" style={{ padding: '80px', textAlign: 'center', marginTop: '24px' }}>
                    <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 24px', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Inventory Healthy</h2>
                    <p style={{ color: 'var(--text-muted)' }}>All products are currently above their restock thresholds.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
                    {alerts.map(item => (
                        <div key={item.id} className="glass" style={{ padding: '24px', borderLeft: `4px solid ${item.stock_quantity <= 0 ? 'var(--error)' : 'var(--warning)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ fontSize: '2.5rem' }}>{item.emoji || '📦'}</div>
                                <div className="glass" style={{
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: item.stock_quantity <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: item.stock_quantity <= 0 ? 'var(--error)' : 'var(--warning)'
                                }}>
                                    {item.stock_quantity <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>{item.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{item.stock_quantity}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Items remaining</span>
                            </div>
                            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={14} color="var(--warning)" />
                                <span>Restock Threshold: {item.low_stock_threshold || 10}</span>
                            </div>
                            <button
                                onClick={() => window.location.href = '?view=inventory'}
                                className="glass"
                                style={{ width: '100%', marginTop: '20px', padding: '10px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                            >
                                Manage Stock
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="glass" style={{ marginTop: '40px', padding: '24px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} color="var(--primary)" />
                    Proactive Restocking Tip
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    To avoid stockouts, we recommend restocking when items hit their &quot;Low Stock&quot; threshold.
                    You can adjust these thresholds individually in the Inventory Management settings.
                </p>
            </div>
        </div>
    );
};

export default AlertsView;
