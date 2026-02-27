'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Plus,
    Trash2,
    Edit2,
    Search,
    Filter,
    Calendar,
    Truck,
    AlertCircle,
    Receipt,
    Wallet
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { useUser } from '@/lib/UserContext';

const ExpensesView = () => {
    const { profile } = useUser();
    const [expenses, setExpenses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    const [newExpense, setNewExpense] = useState({
        amount: '',
        category: 'other',
        branch_id: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
    });

    const categories = ['rent', 'utilities', 'salary', 'marketing', 'inventory', 'other'];

    useEffect(() => {
        fetchExpenses();
        fetchBranches();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    branches ( name )
                `)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
        if (data) setBranches(data);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .insert([{
                    amount: parseFloat(newExpense.amount),
                    category: newExpense.category,
                    branch_id: newExpense.branch_id || null,
                    description: newExpense.description,
                    expense_date: newExpense.expense_date,
                    created_by: profile?.id
                }])
                .select().single();

            if (error) throw error;

            await logAction('CREATE_EXPENSE', 'expenses', data.id, {
                amount: data.amount,
                category: data.category
            });

            setShowAddModal(false);
            setNewExpense({
                amount: '',
                category: 'other',
                branch_id: '',
                description: '',
                expense_date: new Date().toISOString().split('T')[0]
            });
            fetchExpenses();
        } catch (err) {
            alert('Error adding expense: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            fetchExpenses();
        } catch (err) {
            alert('Error deleting expense: ' + err.message);
        }
    };

    const filteredExpenses = expenses.filter(exp => {
        const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
        const matchesSearch = exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Store Expenses</h1>
                    <p className={styles.subtitle}>Track operational costs and overheads.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    <Plus size={18} />
                    <span style={{ fontWeight: 600 }}>Log Expense</span>
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '24px' }}>
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wallet size={16} /> Total Expenses
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '8px' }}>₱{totalAmount.toLocaleString()}</div>
                </div>
            </div>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="glass" style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="glass"
                        style={{ padding: '10px 16px', color: 'white' }}
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '16px 8px' }}>DATE</th>
                                <th style={{ padding: '16px 8px' }}>CATEGORY</th>
                                <th style={{ padding: '16px 8px' }}>BRANCH</th>
                                <th style={{ padding: '16px 8px' }}>DESCRIPTION</th>
                                <th style={{ padding: '16px 8px', textAlign: 'right' }}>AMOUNT</th>
                                <th style={{ padding: '16px 8px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No expenses logged yet.</td>
                                </tr>
                            ) : filteredExpenses.map((exp) => (
                                <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px 8px', fontSize: '0.85rem' }}>{new Date(exp.expense_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '16px 8px' }}>
                                        <div className="glass" style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)' }}>
                                            {exp.category}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 8px', color: 'var(--text-muted)' }}>{exp.branches?.name || 'Global'}</td>
                                    <td style={{ padding: '16px 8px' }}>{exp.description || '-'}</td>
                                    <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 700 }}>₱{parseFloat(exp.amount).toFixed(2)}</td>
                                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ color: 'var(--error)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Expense Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Log New Expense</h2>
                        <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount (₱)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass"
                                    style={{ width: '100%', padding: '12px' }}
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                                <select
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', color: 'white' }}
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Branch (Optional)</label>
                                <select
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', color: 'white' }}
                                    value={newExpense.branch_id}
                                    onChange={e => setNewExpense({ ...newExpense, branch_id: e.target.value })}
                                >
                                    <option value="">Global / Master</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label>
                                <input
                                    type="date"
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', color: 'white' }}
                                    value={newExpense.expense_date}
                                    onChange={e => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</label>
                                <input
                                    type="text"
                                    className="glass"
                                    style={{ width: '100%', padding: '12px' }}
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    placeholder="e.g. Electricity bill Jan 2024"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Logging...' : 'Log Expense'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesView;
