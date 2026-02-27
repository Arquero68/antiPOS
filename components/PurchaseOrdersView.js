'use client';

import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Plus,
    Trash2,
    Search,
    Filter,
    Calendar,
    Truck,
    CheckCircle,
    XCircle,
    FileText,
    ArrowRight,
    Loader2,
    ChevronDown,
    ChevronUp,
    Store
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { useUser } from '@/lib/UserContext';

const PurchaseOrdersView = () => {
    const { profile } = useUser();
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // New PO State
    const [newPO, setNewPO] = useState({
        supplier_id: '',
        branch_id: '',
        notes: '',
        items: [] // { product_id: '', quantity: 1, unit_cost: 0 }
    });

    useEffect(() => {
        fetchOrders();
        fetchSuppliers();
        fetchBranches();
        fetchProducts();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    suppliers ( name ),
                    branches ( name ),
                    purchase_order_items (
                        *,
                        products ( name )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching POs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').order('name');
        if (data) setSuppliers(data);
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
        if (data) setBranches(data);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, cost_price').order('name');
        if (data) setProducts(data);
    };

    const handleAddLineItem = () => {
        setNewPO({
            ...newPO,
            items: [...newPO.items, { product_id: '', quantity: 1, unit_cost: 0 }]
        });
    };

    const handleRemoveLineItem = (index) => {
        const updated = [...newPO.items];
        updated.splice(index, 1);
        setNewPO({ ...newPO, items: updated });
    };

    const updateLineItem = (index, field, value) => {
        const updated = [...newPO.items];
        updated[index][field] = value;

        // If product changes, auto-load its current cost_price
        if (field === 'product_id') {
            const prod = products.find(p => p.id === value);
            if (prod) updated[index].unit_cost = prod.cost_price;
        }

        setNewPO({ ...newPO, items: updated });
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    };

    const handleCreatePO = async (e) => {
        e.preventDefault();
        if (newPO.items.length === 0) return alert('Add at least one item.');
        setSaving(true);
        try {
            const total = calculateTotal(newPO.items);

            // 1. Create the PO header
            const { data: poHeader, error: hError } = await supabase
                .from('purchase_orders')
                .insert([{
                    supplier_id: newPO.supplier_id,
                    branch_id: newPO.branch_id,
                    notes: newPO.notes,
                    total_amount: total,
                    created_by: profile?.id,
                    status: 'draft'
                }])
                .select().single();

            if (hError) throw hError;

            // 2. Create the items
            const itemsToInsert = newPO.items.map(item => ({
                purchase_order_id: poHeader.id,
                product_id: item.product_id,
                quantity: parseInt(item.quantity),
                unit_cost: parseFloat(item.unit_cost)
            }));

            const { error: iError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (iError) throw iError;

            await logAction('CREATE_PO', 'purchase_orders', poHeader.id, { total });

            setShowAddModal(false);
            setNewPO({ supplier_id: '', branch_id: '', notes: '', items: [] });
            fetchOrders();
        } catch (err) {
            alert('Error creating PO: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReceivePO = async (poId) => {
        if (!confirm('This will update inventory levels and log an expense. Proceed?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.rpc('receive_purchase_order', {
                po_id: poId,
                staff_id: profile?.id
            });

            if (error) throw error;

            await logAction('RECEIVE_PO', 'purchase_orders', poId, {});
            fetchOrders();
        } catch (err) {
            alert('Error receiving PO: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyles = (status) => {
        switch (status) {
            case 'received': return { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'draft': return { color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
            case 'sent': return { color: 'var(--primary)', bg: 'rgba(59, 130, 246, 0.1)' };
            case 'cancelled': return { color: 'var(--error)', bg: 'rgba(239, 68, 68, 0.1)' };
            default: return {};
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Purchase Orders</h1>
                    <p className={styles.subtitle}>Procure inventory and manage supplier shipments.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass"
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    <Plus size={18} />
                    <span style={{ fontWeight: 600 }}>Create PO</span>
                </button>
            </header>

            <div className="glass" style={{ padding: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="glass" style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search by Vendor or ID..."
                            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="glass"
                        style={{ padding: '10px 16px', color: 'white' }}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '16px 8px' }}>PO ID / DATE</th>
                                <th style={{ padding: '16px 8px' }}>SUPPLIER</th>
                                <th style={{ padding: '16px 8px' }}>BRANCH</th>
                                <th style={{ padding: '16px 8px' }}>STATUS</th>
                                <th style={{ padding: '16px 8px', textAlign: 'right' }}>TOTAL</th>
                                <th style={{ padding: '16px 8px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} /></td></tr>
                            ) : filteredOrders.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr
                                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: expandedOrder === order.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    >
                                        <td style={{ padding: '16px 8px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{order.id.slice(0, 8)}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ padding: '16px 8px' }}>{order.suppliers?.name}</td>
                                        <td style={{ padding: '16px 8px', color: 'var(--text-muted)' }}>{order.branches?.name}</td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: getStatusStyles(order.status).color,
                                                background: getStatusStyles(order.status).bg
                                            }}>
                                                {order.status}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 700 }}>₱{parseFloat(order.total_amount).toLocaleString()}</td>
                                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                            {expandedOrder === order.id ? <ChevronUp size={16} opacity={0.5} /> : <ChevronDown size={16} opacity={0.5} />}
                                        </td>
                                    </tr>
                                    {expandedOrder === order.id && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '24px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Items in this Order</h4>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        {order.status !== 'received' && order.status !== 'cancelled' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleReceivePO(order.id); }}
                                                                className="glass"
                                                                style={{ padding: '6px 12px', background: 'var(--success)', color: 'white', border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                            >
                                                                <CheckCircle size={14} /> Receive Items
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <th style={{ padding: '8px 0' }}>Product</th>
                                                            <th style={{ padding: '8px 0' }}>Qty</th>
                                                            <th style={{ padding: '8px 0' }}>Unit Cost</th>
                                                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.purchase_order_items.map(item => (
                                                            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                <td style={{ padding: '8px 0' }}>{item.products?.name}</td>
                                                                <td style={{ padding: '8px 0' }}>{item.quantity}</td>
                                                                <td style={{ padding: '8px 0' }}>₱{parseFloat(item.unit_cost).toFixed(2)}</td>
                                                                <td style={{ padding: '8px 0', textAlign: 'right' }}>₱{(item.quantity * item.unit_cost).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {order.notes && <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Notes: {order.notes}</div>}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add PO Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '24px' }}>Create Purchase Order</h2>
                        <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</label>
                                    <select
                                        className="glass"
                                        style={{ width: '100%', padding: '12px', color: 'white' }}
                                        value={newPO.supplier_id}
                                        onChange={e => setNewPO({ ...newPO, supplier_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Vendor</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination Branch</label>
                                    <select
                                        className="glass"
                                        style={{ width: '100%', padding: '12px', color: 'white' }}
                                        value={newPO.branch_id}
                                        onChange={e => setNewPO({ ...newPO, branch_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Items</label>
                                    <button type="button" onClick={handleAddLineItem} className="glass" style={{ padding: '4px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Plus size={12} /> Add Product
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {newPO.items.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                className="glass"
                                                style={{ padding: '8px', color: 'white', fontSize: '0.8rem' }}
                                                value={item.product_id}
                                                onChange={(e) => updateLineItem(index, 'product_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Product</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                className="glass"
                                                style={{ padding: '8px', fontSize: '0.8rem' }}
                                                value={item.quantity}
                                                onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                                required
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Cost"
                                                className="glass"
                                                style={{ padding: '8px', fontSize: '0.8rem' }}
                                                value={item.unit_cost}
                                                onChange={(e) => updateLineItem(index, 'unit_cost', e.target.value)}
                                                required
                                            />
                                            <button type="button" onClick={() => handleRemoveLineItem(index)} style={{ color: 'var(--error)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notes</label>
                                <textarea
                                    className="glass"
                                    style={{ width: '100%', padding: '12px', background: 'transparent', color: 'white', minHeight: '60px' }}
                                    value={newPO.notes}
                                    onChange={e => setNewPO({ ...newPO, notes: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.85rem' }}>Estimated Total:</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₱{calculateTotal(newPO.items).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="glass" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="glass" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none' }}>{saving ? 'Processing...' : 'Save Purchase Order'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrdersView;
