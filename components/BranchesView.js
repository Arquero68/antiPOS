'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { Store, MapPin, Users, Clock, ArrowRight, Circle, Loader2, Plus, Edit2, Trash2, Save, X, ShieldAlert } from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

const BranchCard = ({ branch, onEdit, onDelete }) => (
    <div className="glass glass-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="glass" style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                    <Store size={22} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{branch.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {branch.location}
                    </div>
                </div>
            </div>
            <div className="glass" style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: branch.is_active ? 'var(--success)' : 'var(--error)' }}>
                <Circle size={8} fill="currentColor" />
                {branch.is_active ? 'OPEN' : 'CLOSED'}
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TODAY SALES</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>${(branch.sales || 0).toFixed(2)}</div>
            </div>
            <div className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>STAFF</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{branch.staff_count || 0} Active</div>
            </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onEdit(branch)}
                    style={{ background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(branch.id)}
                    style={{ background: 'transparent', color: 'var(--error)', fontWeight: 600, fontSize: '0.85rem' }}
                >
                    Delete
                </button>
            </div>
            <button style={{ background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Details <ArrowRight size={14} />
            </button>
        </div>
    </div>
);

const BranchesView = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [saving, setSaving] = useState(false);
    const [branchForm, setBranchForm] = useState({
        name: '',
        location: '',
        is_active: true
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('branches')
                .select('*');

            if (error) throw error;

            setBranches(data || []);
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBranch = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('branches')
                .insert([branchForm])
                .select()
                .single();

            if (error) throw error;

            await logAction('CREATE_BRANCH', 'branches', data.id, { name: data.name, location: data.location });

            setShowAddModal(false);
            setBranchForm({ name: '', location: '', is_active: true });
            fetchBranches();
        } catch (err) {
            alert('Error adding branch: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditBranch = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('branches')
                .update({
                    name: selectedBranch.name,
                    location: selectedBranch.location,
                    is_active: selectedBranch.is_active
                })
                .eq('id', selectedBranch.id);

            if (error) throw error;

            await logAction('UPDATE_BRANCH', 'branches', selectedBranch.id, {
                name: selectedBranch.name,
                is_active: selectedBranch.is_active
            });

            setShowEditModal(false);
            setSelectedBranch(null);
            fetchBranches();
        } catch (err) {
            alert('Error updating branch: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBranch = async (id) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;
        try {
            const { data: branch } = await supabase.from('branches').select('name').eq('id', id).single();

            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAction('DELETE_BRANCH', 'branches', id, { name: branch?.name });
            fetchBranches();
        } catch (err) {
            alert('Error deleting branch: ' + err.message);
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Branch Management</h1>
                    <p className={styles.subtitle}>Monitor and control operational status across all locations.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <Plus size={18} />
                    <span style={{ fontWeight: 600 }}>Add Branch</span>
                </button>
            </header>

            {/* Add Branch Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Add New Branch</h2>
                        <form onSubmit={handleAddBranch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Branch Name</label>
                                <input required className="glass" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)' }} value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</label>
                                <input required className="glass" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)' }} value={branchForm.location} onChange={e => setBranchForm({ ...branchForm, location: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Saving...' : 'Save Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Branch Modal */}
            {showEditModal && selectedBranch && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Edit Branch</h2>
                        <form onSubmit={handleEditBranch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Branch Name</label>
                                <input required className="glass" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)' }} value={selectedBranch.name} onChange={e => setSelectedBranch({ ...selectedBranch, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</label>
                                <input required className="glass" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)' }} value={selectedBranch.location} onChange={e => setSelectedBranch({ ...selectedBranch, location: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={selectedBranch.is_active} onChange={e => setSelectedBranch({ ...selectedBranch, is_active: e.target.checked })} />
                                <label>Active / Online</label>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Updating...' : 'Update Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: loading ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
                marginTop: '24px'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px', color: 'var(--text-muted)' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span>Fetching branch data...</span>
                    </div>
                ) : error ? (
                    <div style={{ padding: '24px', color: 'var(--error)', textAlign: 'center' }}>
                        Error: {error}
                    </div>
                ) : branches.length === 0 ? (
                    <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No branches registered.
                    </div>
                ) : (
                    branches.map(branch => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            onEdit={(b) => { setSelectedBranch(b); setShowEditModal(true); }}
                            onDelete={handleDeleteBranch}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default BranchesView;
