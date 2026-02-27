'use client';

import React, { useState, useEffect } from 'react';
import {
    Ticket,
    Plus,
    Search,
    Calendar,
    Percent,
    Banknote,
    Trash2,
    Loader2,
    CheckCircle2,
    XCircle,
    Activity
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';

const PromotionsView = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        type: 'percent',
        value: '',
        min_spend: 0,
        expiry_date: '',
        is_active: true
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (err) {
            console.error('Error fetching coupons:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCoupon = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('coupons')
                .insert([{
                    code: newCoupon.code.toUpperCase().replace(/\s/g, ''),
                    type: newCoupon.type,
                    value: parseFloat(newCoupon.value),
                    min_spend: parseFloat(newCoupon.min_spend),
                    expiry_date: newCoupon.expiry_date || null,
                    is_active: newCoupon.is_active
                }])
                .select()
                .single();

            if (error) throw error;

            await logAction('CREATE_COUPON', 'coupons', data.id, { code: data.code, value: data.value, type: data.type });

            setShowAddModal(false);
            setNewCoupon({ code: '', type: 'percent', value: '', min_spend: 0, expiry_date: '', is_active: true });
            fetchCoupons();
        } catch (err) {
            alert('Error adding coupon: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleCouponStatus = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchCoupons();
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    const handleDeleteCoupon = async (id, code) => {
        if (!confirm(`Delete coupon ${code}?`)) return;
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            await logAction('DELETE_COUPON', 'coupons', id, { code });
            fetchCoupons();
        } catch (err) {
            alert('Error deleting coupon: ' + err.message);
        }
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Promotions & Coupons</h1>
                    <p className={styles.subtitle}>Manage discount codes and seasonal offers.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <Plus size={18} />
                    <span>Create Coupon</span>
                </button>
            </header>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', marginBottom: '24px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by code..."
                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.81rem' }}>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>COUPON CODE</th>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>DISCOUNT</th>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>MIN. SPEND</th>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>EXPIRY</th>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>USAGE</th>
                                <th style={{ padding: '16px 12px', textAlign: 'left' }}>STATUS</th>
                                <th style={{ padding: '16px 12px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>
                                        <Loader2 className="animate-spin" size={32} />
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No coupons found.</td>
                                </tr>
                            ) : filteredCoupons.map(coupon => (
                                <tr key={coupon.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: coupon.is_active ? 1 : 0.6 }}>
                                    <td style={{ padding: '16px 12px' }}>
                                        <div className="glass" style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '4px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>
                                            {coupon.code}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 12px', fontWeight: 700 }}>
                                        {coupon.type === 'percent' ? `${coupon.value}%` : `₱${parseFloat(coupon.value).toFixed(2)}`}
                                    </td>
                                    <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>
                                        ₱{parseFloat(coupon.min_spend).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>
                                        {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Activity size={12} color="var(--primary)" />
                                            <span>{coupon.usage_count} used</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <div
                                            onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                        >
                                            {coupon.is_active ? (
                                                <CheckCircle2 size={16} color="var(--success)" />
                                            ) : (
                                                <XCircle size={16} color="var(--error)" />
                                            )}
                                            <span style={{ fontSize: '0.85rem', color: coupon.is_active ? 'var(--success)' : 'var(--error)' }}>
                                                {coupon.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '8px' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Coupon Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '450px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Create New Coupon</h2>
                        <form onSubmit={handleAddCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coupon Code (e.g. SUMMER25)</label>
                                <input
                                    className="glass"
                                    style={{ width: '100%', padding: '10px', textTransform: 'uppercase' }}
                                    value={newCoupon.code}
                                    onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                                    placeholder="Enter code..."
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount Type</label>
                                    <select
                                        className="glass"
                                        style={{ width: '100%', padding: '10px', color: 'white' }}
                                        value={newCoupon.type}
                                        onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })}
                                    >
                                        <option value="percent">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₱)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="glass"
                                        style={{ width: '100%', padding: '10px' }}
                                        value={newCoupon.value}
                                        onChange={e => setNewCoupon({ ...newCoupon, value: e.target.value })}
                                        placeholder={newCoupon.type === 'percent' ? '10%' : '₱10.00'}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min. Spend (₱)</label>
                                    <input
                                        type="number"
                                        className="glass"
                                        style={{ width: '100%', padding: '10px' }}
                                        value={newCoupon.min_spend}
                                        onChange={e => setNewCoupon({ ...newCoupon, min_spend: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="glass"
                                        style={{ width: '100%', padding: '10px', color: 'white' }}
                                        value={newCoupon.expiry_date}
                                        onChange={e => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>
                                    {saving ? 'Creating...' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionsView;
