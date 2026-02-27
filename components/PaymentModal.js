'use client';

import React, { useState } from 'react';
import {
    CreditCard,
    Banknote,
    Smartphone,
    X,
    CreditCard as Wallet
} from 'lucide-react';
import styles from './PaymentModal.module.css';

const PaymentModal = ({ total, onConfirm, onCancel }) => {
    const [method, setMethod] = useState('card');

    const paymentMethods = [
        { id: 'card', icon: <CreditCard size={32} />, label: 'Credit Card' },
        { id: 'cash', icon: <Banknote size={32} />, label: 'Cash' },
        { id: 'wallet', icon: <Smartphone size={32} />, label: 'Digital Wallet' },
    ];

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} animate-fade-in`}>
                <div className={styles.modalHeader}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Complete Payment</h2>
                    <button onClick={onCancel} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Amount Due</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₱{total.toFixed(2)}
                    </div>
                </div>

                <div className={styles.paymentGrid}>
                    {paymentMethods.map((pm) => (
                        <div
                            key={pm.id}
                            className={`${styles.paymentToggle} ${method === pm.id ? styles.activeToggle : ''}`}
                            onClick={() => setMethod(pm.id)}
                        >
                            {pm.icon}
                            <span style={{ fontWeight: 600 }}>{pm.label}</span>
                        </div>
                    ))}
                </div>

                <div>
                    <button className={styles.confirmBtn} onClick={() => onConfirm(method)}>
                        Confirm Payment
                    </button>
                    <button className={styles.cancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
