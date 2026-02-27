'use client';

import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Mail, Phone, MapPin,
    Trash2, Edit2, Loader2, Save, X, Briefcase, History
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';

const SuppliersView = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [viewingHistory, setViewingHistory] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');
            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplierOrders = async (supplierId) => {
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, branches(name)')
                .eq('supplier_id', supplierId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setOrderHistory(data || []);
        } catch (err) {
            console.error('Error fetching PO history:', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSupplier) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(formData)
                    .eq('id', editingSupplier.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert([formData]);
                if (error) throw error;
            }
            setShowModal(false);
            setEditingSupplier(null);
            setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
            fetchSuppliers();
        } catch (err) {
            alert('Error saving supplier: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this supplier?')) return;
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            fetchSuppliers();
        } catch (err) {
            alert('Error deleting supplier: ' + err.message);
        }
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || ''
        });
        setShowModal(true);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Supplier Management</h1>
                    <p className={styles.subtitle}>Manage your vendors and contact information.</p>
                </div>
                <button
                    className="glass"
                    onClick={() => {
                        setEditingSupplier(null);
                        setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
                        setShowModal(true);
                    }}
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <Plus size={18} />
                    <span style={{ fontWeight: 600 }}>Add Supplier</span>
                </button>
            </header>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div className="glass" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', maxWidth: '400px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="glass" style={{ padding: '20px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Briefcase size={24} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{supplier.name}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{supplier.contact_person || 'No contact person'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Mail size={14} />
                                    <span>{supplier.email || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={14} />
                                    <span>{supplier.phone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={14} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.address || 'N/A'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button onClick={() => openEdit(supplier)} className="glass glass-hover" style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={() => handleDelete(supplier.id)} className="glass glass-hover" style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--error)' }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                                <button
                                    onClick={() => { setViewingHistory(supplier); fetchSupplierOrders(supplier.id); }}
                                    className="glass glass-hover"
                                    style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--primary)' }}
                                    title="View Order History"
                                >
                                    <History size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredSuppliers.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No suppliers found.
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '500px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                            <X size={24} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Company Name</label>
                                <input className="glass" style={{ width: '100%', padding: '12px' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Person</label>
                                <input className="glass" style={{ width: '100%', padding: '12px' }} value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                                    <input type="email" className="glass" style={{ width: '100%', padding: '12px' }} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
                                    <input className="glass" style={{ width: '100%', padding: '12px' }} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Address</label>
                                <textarea className="glass" style={{ width: '100%', padding: '12px', minHeight: '80px', background: 'transparent', color: 'white' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <button type="submit" disabled={saving} className="glass" style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, marginTop: '12px' }}>
                                {saving ? <Loader2 className="animate-spin" size={20} /> : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {viewingHistory && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '700px', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Order History</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{viewingHistory.name}</p>
                            </div>
                            <X size={24} onClick={() => setViewingHistory(null)} style={{ cursor: 'pointer' }} />
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '12px 8px' }}>DATE</th>
                                        <th style={{ padding: '12px 8px' }}>ID</th>
                                        <th style={{ padding: '12px 8px' }}>BRANCH</th>
                                        <th style={{ padding: '12px 8px' }}>STATUS</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderHistory.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No orders found for this supplier.</td></tr>
                                    ) : orderHistory.map(order => (
                                        <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 8px' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>#{order.id.slice(0, 8)}</td>
                                            <td style={{ padding: '12px 8px' }}>{order.branches?.name || 'Unknown'}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: order.status === 'received' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: order.status === 'received' ? 'var(--success)' : 'inherit'
                                                }}>
                                                    {order.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>₱{parseFloat(order.total_amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersView;
