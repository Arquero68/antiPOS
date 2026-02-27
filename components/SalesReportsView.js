'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    Calendar,
    Download,
    Filter,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Banknote,
    ShieldAlert
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';

const SalesReportsView = () => {
    const { profile } = useUser();
    const [filterDays, setFilterDays] = useState(7);
    const [rawTransactions, setRawTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState('₱');

    // Analytics States
    const [revenueData, setRevenueData] = useState([]);
    const [branchPerformance, setBranchPerformance] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [stats, setStats] = useState({
        grossRevenue: 0,
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
        netMargin: 0,
        averageOrderValue: 0,
        growth: 0
    });

    const exportToCSV = () => {
        if (!rawTransactions.length) return;

        const headers = ['Date', 'Transaction ID', 'Branch', 'Payment Method', 'Total Amount'];
        const rows = rawTransactions.map(t => [
            new Date(t.created_at).toLocaleString(),
            t.id,
            t.branches?.name || 'N/A',
            t.payment_method,
            t.total_amount.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `antiPOS_Sales_Report_${filterDays}d.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filterDays);
            const isoCutoff = cutoffDate.toISOString();

            // 1. Fetch Transactions in range with Branch Join
            const { data: transactions, error: tError } = await supabase
                .from('transactions')
                .select('*, branches(name)')
                .gte('created_at', isoCutoff)
                .order('created_at', { ascending: true });

            if (tError) throw tError;

            setRawTransactions(transactions);

            // 2. Fetch Branches for performance aggregation
            const { data: branches, error: bError } = await supabase
                .from('branches')
                .select('id, name');

            if (bError) throw bError;

            // 3. Aggregate Revenue by Date
            const revenueMap = {};
            let totalRevenue = 0;

            transactions.forEach(t => {
                const dateKey = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                revenueMap[dateKey] = (revenueMap[dateKey] || 0) + parseFloat(t.total_amount);
                totalRevenue += parseFloat(t.total_amount);
            });


            // 4. Branch Performance
            const performance = branches.map((b, i) => {
                const branchSales = transactions
                    .filter(t => t.branch_id === b.id)
                    .reduce((sum, t) => sum + parseFloat(t.total_amount), 0);

                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                return {
                    name: b.name,
                    sales: branchSales,
                    color: colors[i % colors.length]
                };
            });

            // 5. Top Products and Profitability
            const { data: items, error: pError } = await supabase
                .from('transaction_items')
                .select(`
                    quantity,
                    unit_price,
                    cost_price,
                    created_at,
                    products ( name )
                `)
                .gte('created_at', isoCutoff);

            if (pError) throw pError;

            // 5.5. Fetch Expenses in range
            const { data: expenseData, error: eError } = await supabase
                .from('expenses')
                .select('*')
                .gte('expense_date', isoCutoff);

            if (eError) throw eError;

            const totalExpenses = expenseData?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
            const expenseMap = {};
            expenseData?.forEach(exp => {
                const dateKey = new Date(exp.expense_date).toLocaleDateString([], { month: 'short', day: 'numeric' });
                expenseMap[dateKey] = (expenseMap[dateKey] || 0) + parseFloat(exp.amount);
            });

            const productSales = {};
            let totalCost = 0;
            const analyticsMap = {};

            items.forEach(item => {
                const name = item.products?.name || 'Unknown';
                const itemRevenue = item.quantity * parseFloat(item.unit_price);
                const itemCost = item.quantity * parseFloat(item.cost_price || 0);

                productSales[name] = (productSales[name] || 0) + item.quantity;
                totalCost += itemCost;

                const dateKey = new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                if (!analyticsMap[dateKey]) analyticsMap[dateKey] = { revenue: 0, profit: 0 };
                analyticsMap[dateKey].revenue += itemRevenue;
                analyticsMap[dateKey].profit += (itemRevenue - itemCost);
            });

            const trend = Object.entries(analyticsMap).map(([name, data]) => ({
                name,
                revenue: data.revenue,
                grossProfit: data.profit,
                netProfit: data.profit - (expenseMap[name] || 0)
            }));

            const sortedProducts = Object.entries(productSales)
                .map(([name, sales]) => ({ name, sales, growth: '+0%' }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 5);

            const grossProfit = totalRevenue - totalCost;
            const netProfit = grossProfit - totalExpenses;

            setRevenueData(trend);
            setBranchPerformance(performance);
            setTopProducts(sortedProducts);
            setStats({
                grossRevenue: totalRevenue,
                grossProfit: grossProfit,
                totalExpenses: totalExpenses,
                netProfit: netProfit,
                netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
                averageOrderValue: transactions.length > 0 ? totalRevenue / transactions.length : 0,
                growth: 12.5
            });

            // 6. Fetch Settings
            const { data: sData } = await supabase.from('settings').select('*').eq('key', 'currency_symbol').single();
            if (sData) setCurrencySymbol(sData.value);

        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [filterDays]);

    useEffect(() => {
        fetchAnalytics();
    }, [filterDays, fetchAnalytics]);

    if (profile && profile.role === 'cashier') {
        return (
            <div style={{
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <ShieldAlert size={64} color="var(--error)" style={{ marginBottom: '24px', opacity: 0.5 }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Security Restriction</h2>
                <p>Only Administrators and Managers can access Sales Analytics.</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="glass"
                    style={{ marginTop: '24px', padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600 }}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Sales Analytics</h1>
                    <p className={styles.subtitle}>Detailed insights into your business performance and growth.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="glass" style={{ padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <Banknote size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem' }}>Gross Revenue</span>
                    </div>
                    <select
                        className="glass"
                        style={{ padding: '10px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        value={filterDays}
                        onChange={(e) => setFilterDays(parseInt(e.target.value))}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <button
                        className="glass"
                        onClick={exportToCSV}
                        disabled={loading || rawTransactions.length === 0}
                        style={{ padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none', opacity: (loading || rawTransactions.length === 0) ? 0.5 : 1 }}
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </header>

            <div className={styles.statsGrid} style={{ marginTop: '24px' }}>
                <div className="glass" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gross Revenue</div>
                    <div style={{ fontSize: 1.75 + 'rem', fontWeight: 800, marginTop: '8px' }}>
                        {loading ? '...' : `${currencySymbol}${stats.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ArrowUpRight size={14} /> +{stats.growth}% vs last period
                    </div>
                </div>
                <div className="glass" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gross Profit</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: 'var(--success)' }}>
                        {loading ? '...' : `${currencySymbol}${stats.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Total margin from sales
                    </div>
                </div>
                <div className="glass" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Net Profit</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px', color: stats.netProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {loading ? '...' : `${currencySymbol}${stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        After ₱{stats.totalExpenses.toLocaleString()} expenses
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid} style={{ marginTop: '24px' }}>
                <div className={`${styles.chartContainer} glass`} style={{ minHeight: '350px', padding: '24px' }}>
                    <h3 className={styles.sectionTitle}>Revenue Trend</h3>
                    <div style={{ height: '300px', marginTop: '16px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading Trend Data...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fill="url(#colorRevenue)" strokeWidth={3} name="Revenue" />
                                    <Area type="monotone" dataKey="grossProfit" stroke="var(--success)" fill="url(#colorProfit)" strokeWidth={3} name="Gross Profit" />
                                    <Area type="monotone" dataKey="netProfit" stroke="#f59e0b" fill="url(#colorNet)" strokeWidth={2} strokeDasharray="5 5" name="Net Profit" />
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className={`${styles.chartContainer} glass`} style={{ minHeight: '350px', padding: '24px' }}>
                    <h3 className={styles.sectionTitle}>Branch Performance</h3>
                    <div style={{ height: '300px', marginTop: '16px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading Branch Data...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', fontSize: 12 }} width={80} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
                                        {branchPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 className={styles.sectionTitle}>Top Selling Products</h3>
                <div style={{ marginTop: '16px' }}>
                    {loading ? (
                        <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading products...</div>
                    ) : topProducts.length === 0 ? (
                        <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No sales data yet.</div>
                    ) : (
                        topProducts.map((product, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === topProducts.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 600 }}>{product.name}</div>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.85rem' }}>{product.sales} Sold</div>
                                    <div style={{ color: product.growth.startsWith('+') ? 'var(--success)' : 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>{product.growth}</div>
                                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesReportsView;
