'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Phone, Mail, Award, ArrowRight, Loader2, ShoppingBag } from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

const CustomersView = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data } = await supabase.from('customers').select('*').order('name');
            if (data) setCustomers(data);
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('customers').insert([newCustomer]);
            if (error) throw error;
            setShowAddModal(false);
            setNewCustomer({ name: '', email: '', phone: '' });
            fetchCustomers();
        } catch (err) {
            alert('Error adding customer: ' + err.message);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Customer CRM</h1>
                    <p className={styles.subtitle}>Manage your customer relationships and loyalty programs.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <UserPlus size={18} />
                    <span>Add Customer</span>
                </button>
            </header>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', marginBottom: '24px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : filteredCustomers.map(customer => (
                        <div key={customer.id} className="glass glass-hover" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ background: 'var(--primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                                    {customer.name[0]}
                                </div>
                                <div className="glass" style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Award size={14} />
                                    {customer.loyalty_points || 0} Pts
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>{customer.name}</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Mail size={14} />
                                    <span>{customer.email || 'No email'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={14} />
                                    <span>{customer.phone || 'No phone'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <ShoppingBag size={14} />
                                    <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <button className="glass" style={{ width: '100%', marginTop: '20px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, color: 'var(--primary)' }}>
                                View History <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Add New Customer</h2>
                        <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</label>
                                <input className="glass" style={{ width: '100%', padding: '10px' }} value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</label>
                                <input type="email" className="glass" style={{ width: '100%', padding: '10px' }} value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</label>
                                <input type="tel" className="glass" style={{ width: '100%', padding: '10px' }} value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>Save Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersView;
