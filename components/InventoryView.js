'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import {
    Package, Search, Plus, Trash2, Edit2, Loader2, Save, X,
    Filter, MoreVertical, ArrowUpDown, ShieldAlert, AlertTriangle, Truck, History
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';

const InventoryView = () => {
    const { profile } = useUser();
    const [search, setSearch] = useState('');
    const [inventoryData, setInventoryData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('all');
    const [currencySymbol, setCurrencySymbol] = useState('₱');

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        sku: '',
        category_id: '',
        supplier_id: '',
        price: '',
        cost_price: '',
        stock_quantity: 0,
        low_stock_threshold: 10
    });

    const [adjustment, setAdjustment] = useState({
        amount: '',
        reason: 'restock',
        notes: ''
    });

    const [transfer, setTransfer] = useState({
        to_branch_id: '',
        quantity: '',
        notes: ''
    });

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*');
        if (data) setCategories(data);
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('*').order('name');
        if (data) setSuppliers(data);
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('*').order('name');
        if (data) setBranches(data || []);
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*').eq('key', 'currency_symbol').single();
        if (data) setCurrencySymbol(data.value);
    };

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('products')
                .select(`
                    *,
                    categories ( id, name ),
                    suppliers ( id, name ),
                    branch_inventory ( branch_id, quantity, low_stock_threshold )
                `);

            if (selectedBranchId !== 'all') {
                // We filter the subquery in JS or use a more complex join if needed.
                // For now, we'll map it in JS to avoid complex RPCs for a simple view.
            }

            const { data, error } = await query;
            if (error) throw error;

            const mappedData = data.map(item => {
                let stock = 0;
                let threshold = item.low_stock_threshold || 10;

                if (selectedBranchId === 'all') {
                    stock = item.branch_inventory?.reduce((sum, bi) => sum + (bi.quantity || 0), 0) || 0;
                } else {
                    const bi = item.branch_inventory?.find(b => b.branch_id === selectedBranchId);
                    stock = bi?.quantity || 0;
                    threshold = bi?.low_stock_threshold || threshold;
                }

                return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku || 'N/A',
                    category: item.categories?.name || 'Uncategorized',
                    category_id: item.categories?.id,
                    supplier: item.suppliers?.name || 'No Supplier',
                    supplier_id: item.suppliers?.id,
                    stock: stock,
                    price: parseFloat(item.price) || 0,
                    cost_price: parseFloat(item.cost_price) || 0,
                    low_stock_threshold: threshold,
                    status: stock > threshold ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock'
                };
            });

            setInventoryData(mappedData);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        if (profile?.role === 'cashier') return;

        fetchProducts();
        fetchCategories();
        fetchSuppliers();
        fetchBranches();
        fetchSettings();

        const channel = supabase
            .channel('inventory-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_inventory' }, () => fetchProducts())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedBranchId, profile?.role, fetchProducts]);

    if (profile?.role === 'cashier') {
        return (
            <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShieldAlert size={64} color="var(--error)" style={{ marginBottom: '24px', opacity: 0.5 }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Management Access Required</h2>
                <p>Contact your administrator to manage inventory.</p>
            </div>
        );
    }


    const handleAddProduct = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: newProduct.name,
                    sku: newProduct.sku,
                    category_id: newProduct.category_id || null,
                    supplier_id: newProduct.supplier_id || null,
                    price: parseFloat(newProduct.price),
                    cost_price: parseFloat(newProduct.cost_price) || 0,
                    stock_quantity: parseInt(newProduct.stock_quantity),
                    low_stock_threshold: parseInt(newProduct.low_stock_threshold)
                }])
                .select()
                .single();

            if (error) throw error;

            await logAction('CREATE_PRODUCT', 'products', data.id, { name: data.name, price: data.price, threshold: data.low_stock_threshold });

            setShowAddModal(false);
            setNewProduct({ name: '', sku: '', category_id: '', price: '', cost_price: '', stock_quantity: 0, low_stock_threshold: 10 });
            fetchProducts();
        } catch (err) {
            alert('Error adding product: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({
                    name: selectedProduct.name,
                    sku: selectedProduct.sku,
                    category_id: selectedProduct.category_id || null,
                    supplier_id: selectedProduct.supplier_id || null,
                    price: parseFloat(selectedProduct.price),
                    cost_price: parseFloat(selectedProduct.cost_price) || 0,
                    stock_quantity: parseInt(selectedProduct.stock),
                    low_stock_threshold: parseInt(selectedProduct.low_stock_threshold)
                })
                .eq('id', selectedProduct.id);

            if (error) throw error;

            await logAction('UPDATE_PRODUCT', 'products', selectedProduct.id, {
                name: selectedProduct.name,
                changes: { price: selectedProduct.price, stock: selectedProduct.stock, threshold: selectedProduct.low_stock_threshold }
            });

            setShowEditModal(false);
            setSelectedProduct(null);
            fetchProducts();
        } catch (err) {
            alert('Error updating product: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        if (selectedBranchId === 'all') {
            alert('Please select a specific branch to adjust stock.');
            return;
        }
        setSaving(true);
        try {
            const amount = parseInt(adjustment.amount);

            // Adjust the branch_inventory instead of products.stock_quantity
            const { error: updateError } = await supabase.rpc('decrement_branch_stock', {
                target_branch_id: selectedBranchId,
                target_product_id: selectedProduct.id,
                amount: -amount // Subtract negative to add
            });

            if (updateError) throw updateError;

            const { data: { session } } = await supabase.auth.getSession();
            const { error: logError } = await supabase
                .from('stock_adjustments')
                .insert([{
                    product_id: selectedProduct.id,
                    staff_id: session?.user?.id,
                    change_amount: amount,
                    reason: adjustment.reason,
                    notes: adjustment.notes
                }]);

            if (logError) throw logError;

            await logAction('ADJUST_STOCK', 'products', selectedProduct.id, {
                product: selectedProduct.name,
                change: amount,
                reason: adjustment.reason
            });

            setShowAdjustModal(false);
            setAdjustment({ amount: '', reason: 'restock', notes: '' });
            fetchProducts();
        } catch (err) {
            alert('Adjustment failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTransferStock = async (e) => {
        e.preventDefault();
        if (selectedBranchId === 'all') {
            alert('Please select a source branch first.');
            return;
        }
        setSaving(true);
        try {
            const qty = parseInt(transfer.quantity);
            if (qty > selectedProduct.stock) {
                throw new Error('Insufficient stock in source branch.');
            }

            const { data: { session } } = await supabase.auth.getSession();

            // 1. Create Transfer Record
            const { data: transferData, error: tError } = await supabase
                .from('inventory_transfers')
                .insert([{
                    from_branch_id: selectedBranchId,
                    to_branch_id: transfer.to_branch_id,
                    product_id: selectedProduct.id,
                    quantity: qty,
                    notes: transfer.notes,
                    created_by: session?.user?.id,
                    status: 'pending'
                }])
                .select().single();

            if (tError) throw tError;

            // 2. Complete Transfer (using RPC for atomicity)
            const { error: execError } = await supabase.rpc('complete_inventory_transfer', {
                transfer_id: transferData.id
            });

            if (execError) throw execError;

            await logAction('TRANSFER_STOCK', 'inventory_transfers', transferData.id, {
                product: selectedProduct.name,
                from: branches.find(b => b.id === selectedBranchId)?.name,
                to: branches.find(b => b.id === transfer.to_branch_id)?.name,
                quantity: qty
            });

            setShowTransferModal(false);
            setTransfer({ to_branch_id: '', quantity: '', notes: '' });
            fetchProducts();
        } catch (err) {
            alert('Transfer failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const { data: prod } = await supabase.from('products').select('name').eq('id', id).single();

            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAction('DELETE_PRODUCT', 'products', id, { name: prod?.name });
            fetchProducts();
        } catch (err) {
            alert('Error deleting product: ' + err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'In Stock': return 'var(--success)';
            case 'Low Stock': return 'var(--warning)';
            case 'Out of Stock': return 'var(--error)';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Inventory Management</h1>
                    <p className={styles.subtitle}>Track and manage your product stock levels.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    <Plus size={18} />
                    <span style={{ fontWeight: 600 }}>Add Product</span>
                </button>
            </header>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="glass" style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search by SKU, Name..."
                            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', minWidth: '250px' }}>
                        <Truck size={18} color="var(--primary)" />
                        <select
                            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', cursor: 'pointer' }}
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                        >
                            <option value="all">🌍 All Branches (Summary)</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>🏢 {b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '16px 8px' }}>PRODUCT</th>
                                <th style={{ padding: '16px 8px' }}>SKU</th>
                                <th style={{ padding: '16px 8px' }}>CATEGORY</th>
                                <th style={{ padding: '16px 8px' }}>SUPPLIER</th>
                                <th style={{ padding: '16px 8px' }}>STOCK</th>
                                <th style={{ padding: '16px 8px' }}>MARGIN</th>
                                <th style={{ padding: '16px 8px' }}>PRICE</th>
                                <th style={{ padding: '16px 8px' }}>STATUS</th>
                                <th style={{ padding: '16px 8px' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                        <Loader2 size={32} className="animate-spin" />
                                    </td>
                                </tr>
                            ) : (
                                inventoryData
                                    .filter(item =>
                                        item.name.toLowerCase().includes(search.toLowerCase()) ||
                                        item.sku.toLowerCase().includes(search.toLowerCase())
                                    )
                                    .map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '16px 8px', fontWeight: 600 }}>{item.name}</td>
                                            <td style={{ padding: '16px 8px', color: 'var(--text-muted)' }}>{item.sku}</td>
                                            <td style={{ padding: '16px 8px' }}>{item.category}</td>
                                            <td style={{ padding: '16px 8px', fontSize: '0.85rem' }}>{item.supplier}</td>
                                            <td style={{ padding: '16px 8px', fontWeight: 700 }}>
                                                <span style={{ color: item.status === 'Low Stock' ? 'var(--warning)' : item.status === 'Out of Stock' ? 'var(--error)' : 'inherit' }}>
                                                    {item.stock}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 8px', color: 'var(--success)', fontSize: '0.85rem' }}>
                                                {item.price > 0 ? (((item.price - item.cost_price) / item.price) * 100).toFixed(0) : 0}%
                                            </td>
                                            <td style={{ padding: '16px 8px' }}>{currencySymbol}{item.price.toFixed(2)}</td>
                                            <td style={{ padding: '16px 8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(item.status) }}></div>
                                                    <span style={{ fontSize: '0.85rem' }}>{item.status}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 8px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => { setSelectedProduct(item); setShowAdjustModal(true); }} style={{ color: 'var(--primary)', background: 'transparent', cursor: 'pointer' }} title="Adjust Stock"><History size={16} /></button>
                                                    {selectedBranchId !== 'all' && (
                                                        <button onClick={() => { setSelectedProduct(item); setShowTransferModal(true); }} style={{ color: 'var(--secondary)', background: 'transparent', cursor: 'pointer' }} title="Transfer to Branch"><Truck size={16} /></button>
                                                    )}
                                                    <button onClick={() => { setSelectedProduct(item); setShowEditModal(true); }} style={{ color: 'var(--primary)', background: 'transparent', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteProduct(item.id)} style={{ color: 'var(--error)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Product Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '450px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Add New Product</h2>
                        <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</label>
                                    <input className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU</label>
                                    <input className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                                <select className="glass" style={{ width: '100%', padding: '10px', color: 'white' }} value={newProduct.category_id} onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</label>
                                <select className="glass" style={{ width: '100%', padding: '10px', color: 'white' }} value={newProduct.supplier_id} onChange={e => setNewProduct({ ...newProduct, supplier_id: e.target.value })}>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost Price (₱)</label>
                                    <input type="number" step="0.01" className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.cost_price} onChange={e => setNewProduct({ ...newProduct, cost_price: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selling Price (₱)</label>
                                    <input type="number" step="0.01" className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Stock</label>
                                    <input type="number" className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.stock_quantity} onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low Stock Alert @</label>
                                    <input type="number" className="glass" style={{ width: '100%', padding: '10px' }} value={newProduct.low_stock_threshold} onChange={e => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })} required />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Saving...' : 'Save Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '450px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '24px' }}>Edit Product</h2>
                        <form onSubmit={handleEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</label>
                                    <input className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.name} onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU</label>
                                    <input className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.sku} onChange={e => setSelectedProduct({ ...selectedProduct, sku: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                                    <select className="glass" style={{ width: '100%', padding: '10px', color: 'white' }} value={selectedProduct.category_id} onChange={e => setSelectedProduct({ ...selectedProduct, category_id: e.target.value })}>
                                        <option value="">Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</label>
                                    <select className="glass" style={{ width: '100%', padding: '10px', color: 'white' }} value={selectedProduct.supplier_id} onChange={e => setSelectedProduct({ ...selectedProduct, supplier_id: e.target.value })}>
                                        <option value="">Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost Price (₱)</label>
                                    <input type="number" step="0.01" className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.cost_price} onChange={e => setSelectedProduct({ ...selectedProduct, cost_price: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selling Price (₱)</label>
                                    <input type="number" step="0.01" className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.price} onChange={e => setSelectedProduct({ ...selectedProduct, price: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock</label>
                                    <input type="number" className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.stock} onChange={e => setSelectedProduct({ ...selectedProduct, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low Stock Alert @</label>
                                    <input type="number" className="glass" style={{ width: '100%', padding: '10px' }} value={selectedProduct.low_stock_threshold} onChange={e => setSelectedProduct({ ...selectedProduct, low_stock_threshold: e.target.value })} required />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Updating...' : 'Update Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {showAdjustModal && selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Adjust Stock</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>{selectedProduct.name} (Current: {selectedProduct.stock})</p>

                        <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity Change (+/-)</label>
                                <input
                                    type="number"
                                    className="glass"
                                    style={{ width: '100%', padding: '12px' }}
                                    placeholder="e.g. 5 or -2"
                                    value={adjustment.amount}
                                    onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reason</label>
                                <select
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', color: 'white' }}
                                    value={adjustment.reason}
                                    onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                                >
                                    <option value="restock">Restock / New Shipment</option>
                                    <option value="spoilage">Spoilage / Expired</option>
                                    <option value="damage">Damaged Goods</option>
                                    <option value="correction">Inventory Correction</option>
                                    <option value="return">Customer Return</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notes</label>
                                <textarea
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', background: 'transparent', color: 'white', minHeight: '60px' }}
                                    value={adjustment.notes}
                                    onChange={e => setAdjustment({ ...adjustment, notes: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving || !adjustment.amount} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>
                                    {saving ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Stock Modal */}
            {showTransferModal && selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '32px' }}>
                        <h2 style={{ marginBottom: '8px' }}>Transfer Stock</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                            Moving <strong>{selectedProduct.name}</strong> from {branches.find(b => b.id === selectedBranchId)?.name}
                        </p>

                        <form onSubmit={handleTransferStock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination Branch</label>
                                <select
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', color: 'white' }}
                                    value={transfer.to_branch_id}
                                    onChange={e => setTransfer({ ...transfer, to_branch_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Target Branch</option>
                                    {branches.filter(b => b.id !== selectedBranchId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity to Move (Max: {selectedProduct.stock})</label>
                                <input
                                    type="number"
                                    className="glass"
                                    style={{ width: '100%', padding: '12px' }}
                                    max={selectedProduct.stock}
                                    min="1"
                                    value={transfer.quantity}
                                    onChange={e => setTransfer({ ...transfer, quantity: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transfer Notes</label>
                                <textarea
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', background: 'transparent', color: 'white', minHeight: '60px' }}
                                    placeholder="e.g. Stock replenishment"
                                    value={transfer.notes}
                                    onChange={e => setTransfer({ ...transfer, notes: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowTransferModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving || !transfer.to_branch_id || !transfer.quantity} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>
                                    {saving ? 'Processing...' : 'Complete Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
