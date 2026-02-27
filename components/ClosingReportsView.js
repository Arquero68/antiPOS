'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText, Printer, Calendar, Banknote,
    CreditCard, ShoppingBag, Loader2, ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';

const ClosingReportsView = () => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        cash: 0,
        card: 0,
        count: 0,
        tax: 0
    });
    const [settings, setSettings] = useState({ currency: '₱', taxRate: 5 });
    const [reportGenerated, setReportGenerated] = useState(false);

    useEffect(() => {
        fetchTodayData();
    }, []);

    const fetchTodayData = async () => {
        try {
            setLoading(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isoToday = today.toISOString();

            // 1. Fetch Settings
            const { data: sData } = await supabase.from('settings').select('*');
            if (sData) {
                const cSymbol = sData.find(s => s.key === 'currency_symbol')?.value || '₱';
                const tRate = parseFloat(sData.find(s => s.key === 'tax_rate')?.value || '5');
                setSettings({ currency: cSymbol, taxRate: tRate });
            }

            // 2. Fetch Transactions
            const { data, error } = await supabase
                .from('transactions')
                .select('*, profiles(full_name)')
                .gte('created_at', isoToday)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setTransactions(data || []);

            // 3. Calculate Summary
            const stats = (data || []).reduce((acc, curr) => {
                acc.total += parseFloat(curr.total_amount);
                if (curr.payment_method === 'cash') acc.cash += parseFloat(curr.total_amount);
                else acc.card += parseFloat(curr.total_amount);
                acc.count += 1;
                // Reverse calculate tax from total
                // total = subtotal * (1 + rate/100) -> subtotal = total / (1 + rate/100)
                const subtotal = parseFloat(curr.total_amount) / (1 + (parseFloat(sData?.find(s => s.key === 'tax_rate')?.value || '5') / 100));
                acc.tax += (parseFloat(curr.total_amount) - subtotal);
                return acc;
            }, { total: 0, cash: 0, card: 0, count: 0, tax: 0 });

            setSummary(stats);
        } catch (err) {
            console.error('Error fetching closing data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintZReport = () => {
        window.print();
        setReportGenerated(true);
    };

    if (loading) return (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Daily Closing (X/Z-Reading)</h1>
                    <p className={styles.subtitle}>Reconcile today&apos;s sales and close the register.</p>
                </div>
                <button
                    className="glass"
                    onClick={handlePrintZReport}
                    style={{ padding: '10px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <Printer size={18} />
                    <span style={{ fontWeight: 600 }}>Generate Z-Report</span>
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '24px' }}>
                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <ShoppingBag size={20} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Gross Sales</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{settings.currency}{summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{summary.count} Transactions</div>
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Banknote size={20} color="var(--success)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cash in Drawer</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{settings.currency}{summary.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <CreditCard size={20} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Card Payments</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{settings.currency}{summary.card.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <FileText size={20} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Tax Collected</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{settings.currency}{summary.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <div className="glass" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={18} color="var(--primary)" />
                    Today&apos;s Transaction Log
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px 8px' }}>Time</th>
                                <th style={{ padding: '12px 8px' }}>Staff</th>
                                <th style={{ padding: '12px 8px' }}>Method</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '16px 8px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td style={{ padding: '16px 8px' }}>{t.profiles?.full_name || 'Staff'}</td>
                                    <td style={{ padding: '16px 8px', textTransform: 'capitalize' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {t.payment_method === 'cash' ? <Banknote size={14} /> : <CreditCard size={14} />}
                                            {t.payment_method}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 700 }}>{settings.currency}{parseFloat(t.total_amount).toFixed(2)}</td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No transactions today.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden printable Z-Report */}
            <div id="z-report" style={{ display: 'none' }}>
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #z-report, #z-report * { visibility: visible; }
                        #z-report { position: absolute; left: 0; top: 0; width: 300px; padding: 20px; color: black; background: white; font-family: monospace; }
                        .print-divider { border-bottom: 1px dashed black; margin: 10px 0; }
                    }
                `}</style>
                <div style={{ textAlign: 'center', textTransform: 'uppercase', fontWeight: 'bold' }}>antiPOS Z-REPORT</div>
                <div style={{ textAlign: 'center', fontSize: '10px' }}>Date: {new Date().toLocaleDateString()}</div>
                <div style={{ textAlign: 'center', fontSize: '10px' }}>Time: {new Date().toLocaleTimeString()}</div>
                <div className="print-divider"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TOTAL SALES:</span> <span>{settings.currency}{summary.total.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CASH:</span> <span>{settings.currency}{summary.cash.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CARD:</span> <span>{settings.currency}{summary.card.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TAX:</span> <span>{settings.currency}{summary.tax.toFixed(2)}</span></div>
                <div className="print-divider"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TRANS. COUNT:</span> <span>{summary.count}</span></div>
                <div className="print-divider"></div>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>-- END OF REPORT --</div>
            </div>
        </div>
    );
};

export default ClosingReportsView;
