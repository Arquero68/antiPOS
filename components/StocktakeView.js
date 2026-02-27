'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList,
    Plus,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowRight,
    Loader2,
    Save,
    History,
    TrendingDown,
    TrendingUp,
    Store
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { useUser } from '@/lib/UserContext';

const StocktakeView = () => {
    const { profile } = useUser();
    const [branches, setBranches] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [products, setProducts] = useState([]);
    const [counts, setCounts] = useState({}); // { product_id: actual_quantity }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [pastSessions, setPastSessions] = useState([]);

    useEffect(() => {
        fetchBranches();
        checkActiveSession();
        fetchPastSessions();
    }, [fetchBranches, checkActiveSession, fetchPastSessions]);

    const fetchBranches = useCallback(async () => {
        const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
        if (data) {
            setBranches(data);
            if (data.length > 0) setSelectedBranchId(data[0].id);
        }
    }, []);

    const fetchPastSessions = useCallback(async () => {
        const { data } = await supabase
            .from('stocktake_sessions')
            .select('*, branches(name)')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(5);
        if (data) setPastSessions(data);
    }, []);

    const checkActiveSession = useCallback(async () => {
        try {
            setLoading(true);
            const { data: sessions, error } = await supabase
                .from('stocktake_sessions')
                .select(`
                    *,
                    branches ( name ),
                    stocktake_counts ( * )
                `)
                .eq('status', 'open')
                .limit(1);

            if (error) throw error;

            if (sessions && sessions.length > 0) {
                const session = sessions[0];
                setActiveSession(session);

                // Initialize counts from existing entries
                const existingCounts = {};
                session.stocktake_counts.forEach(c => {
                    existingCounts[c.product_id] = c.actual_quantity;
                });
                setCounts(existingCounts);

                // Fetch products for that branch
                await fetchProducts(session.branch_id);
            }
        } catch (err) {
            console.error('Error checking active session:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProducts = async (branchId) => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, name, emoji,
                branch_inventory ( quantity )
            `)
            .filter('branch_inventory.branch_id', 'eq', branchId);

        if (data) {
            const mapped = data.map(p => ({
                ...p,
                system_quantity: p.branch_inventory?.[0]?.quantity || 0
            }));
            setProducts(mapped);
        }
    };

    const handleStartSession = async () => {
        if (!selectedBranchId) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('stocktake_sessions')
                .insert([{
                    branch_id: selectedBranchId,
                    started_by: profile?.id,
                    status: 'open'
                }])
                .select().single();

            if (error) throw error;

            await logAction('START_STOCKTAKE', 'stocktake_sessions', data.id, { branch_id: selectedBranchId });
            checkActiveSession();
        } catch (err) {
            alert('Error starting session: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCount = async (productId, actual) => {
        const val = parseInt(actual);
        if (isNaN(val)) return;

        setCounts(prev => ({ ...prev, [productId]: val }));

        // Upsert to DB
        const systemQty = products.find(p => p.id === productId)?.system_quantity || 0;

        await supabase
            .from('stocktake_counts')
            .upsert({
                session_id: activeSession.id,
                product_id: productId,
                system_quantity: systemQty,
                actual_quantity: val,
                staff_id: profile?.id
            }, { onConflict: 'session_id,product_id' });
    };

    const handleApplyReconciliation = async () => {
        if (!confirm('This will permanently adjust the system inventory to match your "Actual" counts. Are you sure?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.rpc('apply_reconciliation', {
                session_id_val: activeSession.id,
                user_id_val: profile?.id
            });

            if (error) throw error;

            await logAction('APPLY_STOCKTAKE', 'stocktake_sessions', activeSession.id, {});
            setActiveSession(null);
            setCounts({});
            setProducts([]);
            fetchPastSessions();
        } catch (err) {
            alert('Error applying reconciliation: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const varianceCount = Object.keys(counts).reduce((acc, pid) => {
        const p = products.find(prod => prod.id === pid);
        if (p && counts[pid] !== p.system_quantity) return acc + 1;
        return acc;
    }, 0);

    if (activeSession) {
        return (
            <div className={styles.dashboardContent}>
                <header className={styles.header}>
                    <div className={styles.title}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="glass" style={{ padding: '8px', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' }}>
                                <ClipboardList size={24} />
                            </div>
                            <div>
                                <h1>Reconciliation: {activeSession.branches?.name}</h1>
                                <p className={styles.subtitle}>Enter physical counts to identify variances.</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => {
                                if (confirm('Discard this session? Data will not be applied.')) {
                                    supabase.from('stocktake_sessions').update({ status: 'cancelled' }).eq('id', activeSession.id).then(() => setActiveSession(null));
                                }
                            }}
                            className="glass"
                            style={{ padding: '10px 20px', color: 'var(--error)', border: '1px solid var(--error)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApplyReconciliation}
                            disabled={Object.keys(counts).length === 0 || saving}
                            className="glass"
                            style={{ padding: '10px 20px', background: 'var(--success)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            <span style={{ fontWeight: 600 }}>Apply Reconciliation</span>
                        </button>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginTop: '24px' }}>
                    <div className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div className="glass" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                <Search size={18} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Find product to count..."
                                    style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        <th style={{ padding: '12px' }}>PRODUCT</th>
                                        <th style={{ padding: '12px' }}>SYSTEM QTY</th>
                                        <th style={{ padding: '12px' }}>ACTUAL COUNT</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>VARIANCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => {
                                        const actual = counts[p.id];
                                        const hasVariance = actual !== undefined && actual !== p.system_quantity;
                                        const variance = actual !== undefined ? actual - p.system_quantity : 0;

                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: hasVariance ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '1.2rem' }}>{p.emoji || '📦'}</span>
                                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>{p.system_quantity}</td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <input
                                                        type="number"
                                                        className="glass"
                                                        style={{ width: '80px', padding: '8px', textAlign: 'center' }}
                                                        value={counts[p.id] === undefined ? '' : counts[p.id]}
                                                        onChange={(e) => handleUpdateCount(p.id, e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                    {actual !== undefined && (
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: variance === 0 ? 'var(--text-muted)' : (variance > 0 ? 'var(--success)' : 'var(--error)'),
                                                            fontWeight: 700
                                                        }}>
                                                            {variance > 0 && <TrendingUp size={14} />}
                                                            {variance < 0 && <TrendingDown size={14} />}
                                                            {variance > 0 ? `+${variance}` : variance}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Session Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Products Counted</span>
                                    <span style={{ fontWeight: 700 }}>{Object.keys(counts).length} / {products.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Variances</span>
                                    <span style={{ fontWeight: 700, color: varianceCount > 0 ? 'var(--error)' : 'inherit' }}>{varianceCount}</span>
                                </div>
                                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
                                        <AlertTriangle size={14} color="#f59e0b" />
                                        <span>Items NOT counted will remain at their current system levels.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Inventory Reconciliation</h1>
                    <p className={styles.subtitle}>Start a stocktake session to verify physical inventory.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div className="glass" style={{ padding: '32px' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="glass" style={{ padding: '12px', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' }}>
                            <Plus size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem' }}>Start New Count</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                        Select a branch to begin a physical count. This will record current system levels for comparison.
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select
                            className="glass"
                            style={{ flex: 1, padding: '12px', color: 'white' }}
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button
                            onClick={handleStartSession}
                            disabled={saving}
                            className="glass"
                            style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600 }}
                        >
                            Begin Session
                        </button>
                    </div>
                </div>

                <div className="glass" style={{ padding: '32px' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="glass" style={{ padding: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
                            <History size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem' }}>Recent Reconciliations</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pastSessions.map(s => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.branches?.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.completed_at).toLocaleString()}</div>
                                </div>
                                <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', alignSelf: 'center' }}>Completed</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StocktakeView;
