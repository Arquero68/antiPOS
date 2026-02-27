'use client';

import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Users,
    Activity,
    Loader2,
    AlertTriangle,
    Banknote,
    ShoppingBag
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

const KPICard = ({ title, value, trend, icon, status, onClick, currency = '₱' }) => (
    <div className={`${styles.kpiCard} glass glass-hover`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={styles.kpiTitle}>{title}</div>
            <div className={`${styles.kpiIcon} ${status === 'error' ? styles.iconError : styles.iconPrimary}`}>
                {icon}
            </div>
        </div>
        <div className={styles.kpiValue} style={{ color: status === 'error' ? 'var(--error)' : 'inherit' }}>
            {typeof value === 'number' ? `${currency}${value.toLocaleString()}` : value}
        </div>
        <div className={`${styles.kpiTrend} ${status === 'up' ? styles.trendUp : status === 'error' ? styles.trendDown : styles.trendDown}`}>
            {status === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trend}</span>
        </div>
    </div>
);

const TransactionItem = ({ tr, currency = '₱' }) => (
    <div className={styles.transactionItem}>
        <div className={styles.transactionInfo}>
            <div className={`${styles.transactionIcon} glass`}>
                <ShoppingBag size={18} color="var(--primary)" />
            </div>
            <div className={styles.transactionMeta}>
                <div className={styles.transactionTitle}>{tr.item}</div>
                <div className={styles.transactionSub}>
                    <span>{tr.branch}</span>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <span>{tr.time}</span>
                </div>
            </div>
        </div>
        <div className={styles.transactionAmount}>
            {currency}{tr.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
    </div>
);

const Dashboard = () => {
    const [kpis, setKpis] = useState({
        totalSales: 0,
        transactionCount: 0,
        customerCount: 0,
        lowStockCount: 0,
        salesTrend: '+0.0%',
        transTrend: '+0.0%',
        custTrend: '+0.0%'
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState('₱');

    useEffect(() => {
        fetchDashboardData();

        const channel = supabase
            .channel('dashboard-live-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchDashboardData())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Fetch Today's Transactions
            const { data: todayTrans } = await supabase
                .from('transactions')
                .select(`
                    *,
                    branches ( name ),
                    transaction_items ( quantity, products ( name ) )
                `)
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            // 2. Fetch All Products for Stock Alert
            const { data: products } = await supabase
                .from('products')
                .select('stock_quantity, low_stock_threshold');

            const lowStockCount = products?.filter(p => p.stock_quantity <= (p.low_stock_threshold || 10)).length || 0;

            // 3. Calculate KPIs
            const totalSales = todayTrans?.reduce((sum, t) => sum + parseFloat(t.total_amount), 0) || 0;
            const transCount = todayTrans?.length || 0;
            const custCount = new Set(todayTrans?.map(t => t.id)).size || 0;

            const feedItems = todayTrans?.slice(0, 5).map(t => ({
                id: t.id,
                branch: t.branches?.name || 'Local Terminal',
                amount: parseFloat(t.total_amount),
                item: t.transaction_items?.[0]?.products?.name + (t.transaction_items?.length > 1 ? ` +${t.transaction_items.length - 1} more` : '') || 'Order',
                time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })) || [];

            setKpis({
                totalSales,
                transactionCount: transCount,
                customerCount: custCount,
                lowStockCount,
                salesTrend: '+12.5%',
                transTrend: '+5.2%',
                custTrend: '-2.4%'
            });
            setRecentTransactions(feedItems);

            // Generate simple chart data
            const hourlySales = {};
            todayTrans?.forEach(t => {
                const hour = new Date(t.created_at).getHours();
                const label = `${hour}:00`;
                hourlySales[label] = (hourlySales[label] || 0) + parseFloat(t.total_amount);
            });
            const sortedHours = Object.entries(hourlySales).map(([name, sales]) => ({ name, sales })).sort((a, b) => parseInt(a.name) - parseInt(b.name));
            setChartData(sortedHours.length > 0 ? sortedHours : [{ name: '08:00', sales: 0 }, { name: '12:00', sales: 0 }, { name: '16:00', sales: 0 }, { name: '20:00', sales: 0 }]);

            // 4. Fetch Settings
            const { data: sData } = await supabase.from('settings').select('*').eq('key', 'currency_symbol').single();
            if (sData) setCurrencySymbol(sData.value);

        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Store Dashboard</h1>
                    <p className={styles.subtitle}>Overview of today&apos;s activity and inventory health.</p>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <KPICard
                    title="Cumulative Sales Today"
                    value={loading ? '...' : kpis.totalSales}
                    trend={kpis.salesTrend}
                    icon={<Banknote size={22} />}
                    status="up"
                    currency={currencySymbol}
                />
                <KPICard
                    title="Low Stock Alerts"
                    value={loading ? '...' : kpis.lowStockCount}
                    trend={`${kpis.lowStockCount} critical items`}
                    icon={<AlertTriangle size={22} />}
                    status={kpis.lowStockCount > 0 ? 'error' : 'up'}
                    onClick={() => window.location.href = '?tab=alerts'}
                />
                <KPICard
                    title="Daily Transactions"
                    value={loading ? '...' : kpis.transactionCount}
                    trend={kpis.transTrend}
                    icon={<ShoppingBag size={22} />}
                    status="up"
                />
            </div>

            <div className={styles.chartsGrid}>
                <div className={`${styles.chartContainer} glass`}>
                    <h3 className={styles.sectionTitle}>Sales Velocity (Today)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'white' }} />
                            <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} fillOpacity={0.1} fill="var(--primary)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className={`${styles.feedContainer} glass`}>
                    <h3 className={styles.sectionTitle}>Recent Activity</h3>
                    <div className={styles.recentList}>
                        {recentTransactions.map(tr => (
                            <TransactionItem key={tr.id} tr={tr} currency={currencySymbol} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
