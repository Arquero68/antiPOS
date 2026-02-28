'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    ArrowLeft,
    ChevronUp,
    Store,
    Loader2,
    Users,
    Ticket,
    Award
} from 'lucide-react';
import styles from './CheckoutPOS.module.css';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';
import { supabase } from '@/lib/supabase';

const CheckoutPOS = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [usePoints, setUsePoints] = useState(false);
    const [storeSettings, setStoreSettings] = useState({ taxRate: 5, currencySymbol: '₱' });
    const [branchError, setBranchError] = useState(null);

    if (!supabase) {
        return (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
                <h1 style={{ marginBottom: '16px', color: 'var(--error)' }}>Configuration Error</h1>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
                    Supabase environment variables are not set. Please add them in Vercel settings.
                </p>
            </div>
        );
    }

    // Dynamic Calculations
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    let discount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discount = subtotal * (appliedCoupon.value / 100);
        } else {
            discount = Math.min(appliedCoupon.value, subtotal);
        }
    }

    const pointsValue = usePoints && selectedCustomer ? Math.min(selectedCustomer.loyalty_points / 100, subtotal - discount) : 0;
    const finalSubtotal = Math.max(0, subtotal - discount - pointsValue);
    const tax = finalSubtotal * (storeSettings.taxRate / 100);
    const total = finalSubtotal + tax;

    // Fetch products, categories, branches, and customers on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch Categories
                const { data: catData } = await supabase.from('categories').select('name');
                if (catData) setCategories(['All', ...catData.map(c => c.name)]);

                // 2. Fetch Branches
                const { data: branchData } = await supabase.from('branches').select('*');
                if (branchData) setBranches(branchData);

                // 3. Fetch Products
                const { data: prodData, error } = await supabase
                    .from('products')
                    .select(`
                        id, name, price, cost_price, emoji, low_stock_threshold,
                        categories ( name ),
                        branch_inventory ( branch_id, quantity, low_stock_threshold )
                    `);

                if (error) throw error;

                const mapped = prodData.map(p => {
                    const bi = p.branch_inventory?.find(b => b.branch_id === selectedBranch?.id);
                    return {
                        id: p.id,
                        name: p.name,
                        price: parseFloat(p.price),
                        cost_price: parseFloat(p.cost_price) || 0,
                        emoji: p.emoji || '📦',
                        category: p.categories?.name,
                        stock: bi?.quantity || 0,
                        threshold: bi?.low_stock_threshold || p.low_stock_threshold || 10
                    };
                });
                setProducts(mapped);

                // 4. Fetch Customers
                const { data: custData } = await supabase.from('customers').select('*').order('name');
                if (custData) setCustomers(custData);

                // 5. Fetch Settings
                const { data: settingsData } = await supabase.from('settings').select('*');
                if (settingsData) {
                    const tRate = settingsData.find(s => s.key === 'tax_rate')?.value || '5';
                    const cSymbol = settingsData.find(s => s.key === 'currency_symbol')?.value || '₱';
                    setStoreSettings({ taxRate: parseFloat(tRate), currencySymbol: cSymbol });
                }
            } catch (err) {
                console.error('Error fetching terminal data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedBranch]); // Re-fetch when branch is assigned or changed

    // ... rest of the logic (cart persistence, filters) ...

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = category === 'All' || p.category === category;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, category]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };


    // Terminal assignment UI (same as before)
    if (!selectedBranch) {
        return (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
                <Store size={48} color="var(--primary)" style={{ marginBottom: '24px' }} />
                <h1 style={{ marginBottom: '8px' }}>Assign Terminal</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Which branch is this device currently serving?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', width: '100%', maxWidth: '800px' }}>
                    {loading ? <Loader2 className="animate-spin" /> : branches.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No branches found. Please add a branch first.</p>
                            {branchError && <p style={{ color: 'var(--error)', marginBottom: '20px)' }}>{branchError}</p>}
                            <button 
                                className="glass" 
                                style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                onClick={async () => {
                                    setBranchError(null);
                                    const { data, error } = await supabase.from('branches').insert([{ name: 'Main Store', location: 'Default Location' }]).select();
                                    if (error) {
                                        setBranchError('Error: ' + error.message + '. Make sure Supabase env vars are set in Vercel.');
                                    } else if (data) {
                                        setBranches(data);
                                    }
                                }}
                            >
                                Add Default Branch
                            </button>
                        </div>
                    ) : branches.map(branch => (
                        <div key={branch.id} className="glass glass-hover" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }} onClick={() => setSelectedBranch(branch)}>
                            <h3>{branch.name}</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{branch.location}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.posWrapper}>
            <section className={styles.catalogSection}>
                <header className={styles.header}>
                    {/* Header logic same as before */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => window.location.href = '/'} className="glass" style={{ padding: '8px' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>antiPOS Store</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setSelectedBranch(null)}>
                                <Store size={12} />
                                <span>{selectedBranch.name}</span>
                                <span style={{ opacity: 0.5 }}>(Change)</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className={styles.categories}>
                    {categories.map(cat => (
                        <button key={cat} className={`${styles.categoryBtn} ${category === cat ? styles.categoryActive : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
                    ))}
                </div>

                <div className={styles.productGrid}>
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className={`${styles.productCard} glass glass-hover`}
                            onClick={() => product.stock > 0 && addToCart(product)}
                            style={{ opacity: product.stock <= 0 ? 0.5 : 1, cursor: product.stock <= 0 ? 'not-allowed' : 'pointer' }}
                        >
                            <div className={styles.productImage}>{product.emoji}</div>
                            <div className={styles.productName}>{product.name}</div>
                            <div className={styles.productPrice}>{storeSettings.currencySymbol}{product.price.toFixed(2)}</div>

                            {/* Dynamic Stock Badge */}
                            {product.stock <= product.threshold && product.stock > 0 && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--warning)', marginTop: '4px', fontWeight: 700 }}>LOW STOCK ({product.stock})</div>
                            )}
                            {product.stock <= 0 && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--error)', marginTop: '4px', fontWeight: 700 }}>OUT OF STOCK</div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Cart and Payment Logic (remains same) */}
            <aside className={`${styles.cartSection} ${isMobileCartOpen ? styles.cartExpanded : ''}`}>
                <div className={styles.cartHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingCart size={22} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Order</h2>
                    </div>
                </div>

                {/* Customer Selection */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    {selectedCustomer ? (
                        <div className="glass" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--success)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{selectedCustomer.name[0]}</div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedCustomer.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedCustomer.loyalty_points} Points</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                                <Users size={16} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Assign Customer..."
                                    style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </div>
                            {customerSearch && (
                                <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                                    {customers
                                        .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch))
                                        .map(customer => (
                                            <div
                                                key={customer.id}
                                                className={styles.customerResult}
                                                style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                onClick={() => { setSelectedCustomer(customer); setCustomerSearch(''); }}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{customer.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{customer.phone || customer.email || 'No contact'}</div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Promotions & Loyalty */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!appliedCoupon ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="glass" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                                <Ticket size={14} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Promo Code"
                                    style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '0.8rem', textTransform: 'uppercase' }}
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!couponCode) return;
                                    const { data, error } = await supabase
                                        .from('coupons')
                                        .select('*')
                                        .eq('code', couponCode.toUpperCase())
                                        .eq('is_active', true)
                                        .single();

                                    if (data) {
                                        if (subtotal < data.min_spend) {
                                            alert(`Minimum spend of ₱${data.min_spend} required.`);
                                        } else if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
                                            alert('Coupon expired.');
                                        } else {
                                            setAppliedCoupon(data);
                                            setCouponCode('');
                                        }
                                    } else {
                                        alert('Invalid coupon code.');
                                    }
                                }}
                                className="glass"
                                style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--primary)', border: 'none' }}
                            >
                                Apply
                            </button>
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dotted var(--primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Ticket size={14} color="var(--primary)" />
                                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{appliedCoupon.code} (-{storeSettings.currencySymbol}{discount.toFixed(2)})</span>
                            </div>
                            <button onClick={() => setAppliedCoupon(null)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.7rem' }}>Remove</button>
                        </div>
                    )}

                    {selectedCustomer && selectedCustomer.loyalty_points > 0 && (
                        <div
                            onClick={() => setUsePoints(!usePoints)}
                            className="glass"
                            style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: usePoints ? '1px solid var(--success)' : '1px solid transparent' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Award size={14} color={usePoints ? 'var(--success)' : 'var(--text-muted)'} />
                                <span style={{ fontSize: '0.8rem', color: usePoints ? 'var(--success)' : 'white' }}>Use Points ({storeSettings.currencySymbol}{(selectedCustomer.loyalty_points / 100).toFixed(2)})</span>
                            </div>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {usePoints && <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '2px' }} />}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.cartItems}>
                    {cart.map(item => (
                        <div key={item.id} className="glass" style={{ padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.5rem' }}>{item.emoji}</div>
                            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{item.name}</div><div>{storeSettings.currencySymbol}{item.price.toFixed(2)}</div></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => updateQuantity(item.id, -1)} className="glass" style={{ padding: '4px' }}>-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="glass" style={{ padding: '4px' }}>+</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.cartFooter}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Subtotal</span>
                            <span>{storeSettings.currencySymbol}{subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                                <span>Discount</span>
                                <span>-{storeSettings.currencySymbol}{discount.toFixed(2)}</span>
                            </div>
                        )}
                        {pointsValue > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                                <span>Points Credit</span>
                                <span>-{storeSettings.currencySymbol}{pointsValue.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Tax ({storeSettings.taxRate}%)</span>
                            <span>{storeSettings.currencySymbol}{tax.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className={styles.totalRow}>
                        <span>Total</span>
                        <span>{storeSettings.currencySymbol}{total.toFixed(2)}</span>
                    </div>
                    <button className={styles.checkoutBtn} disabled={cart.length === 0} onClick={() => setShowPaymentModal(true)}>Complete Checkout</button>
                </div>
            </aside >

            {showPaymentModal && (
                <PaymentModal
                    total={total}
                    onConfirm={async (method) => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();

                            // 1. Insert Transaction
                            const { data: transData, error: transError } = await supabase
                                .from('transactions')
                                .insert({
                                    total_amount: total,
                                    payment_method: method,
                                    branch_id: selectedBranch.id,
                                    staff_id: session?.user?.id,
                                    customer_id: selectedCustomer?.id || null,
                                    coupon_id: appliedCoupon?.id || null,
                                    discount_amount: discount + pointsValue,
                                    points_spent: usePoints ? selectedCustomer?.loyalty_points : 0
                                })
                                .select().single();

                            if (transError) throw transError;

                            // 2. Insert Items
                            await supabase.from('transaction_items').insert(
                                cart.map(i => ({
                                    transaction_id: transData.id,
                                    product_id: i.id,
                                    quantity: i.quantity,
                                    unit_price: i.price,
                                    cost_price: i.cost_price
                                }))
                            );

                            // 3. Update Stock & Coupon/Customer
                            for (const item of cart) {
                                await supabase.rpc('decrement_branch_stock', {
                                    target_branch_id: selectedBranch.id,
                                    target_product_id: item.id,
                                    amount: item.quantity
                                });
                            }

                            if (appliedCoupon) {
                                await supabase.rpc('increment_coupon_usage', { coupon_id: appliedCoupon.id });
                            }

                            if (selectedCustomer) {
                                const newPoints = Math.floor(total); // 1 point per ₱1
                                const pointsToSubtract = usePoints ? selectedCustomer.loyalty_points : 0;
                                await supabase
                                    .from('customers')
                                    .update({
                                        loyalty_points: (selectedCustomer.loyalty_points - pointsToSubtract) + newPoints
                                    })
                                    .eq('id', selectedCustomer.id);
                            }

                            // 4. Finalize
                            setLastTransaction({
                                items: [...cart],
                                total: total,
                                discount: discount + pointsValue,
                                tax: tax,
                                taxRate: storeSettings.taxRate,
                                currency: storeSettings.currencySymbol
                            });
                            setCart([]);
                            setAppliedCoupon(null);
                            setSelectedCustomer(null);
                            setUsePoints(false);
                            setShowPaymentModal(false);
                        } catch (err) {
                            alert('Sale failed: ' + err.message);
                        }
                    }}
                    onCancel={() => setShowPaymentModal(false)}
                />
            )}

            {lastTransaction && (
                <Receipt
                    cart={lastTransaction.items}
                    total={lastTransaction.total}
                    discount={lastTransaction.discount}
                    tax={lastTransaction.tax}
                    taxRate={lastTransaction.taxRate}
                    currency={lastTransaction.currency}
                    onOrderNew={() => setLastTransaction(null)}
                    onPrint={() => window.print()}
                />
            )}
        </div >
    );
};

export default CheckoutPOS;
