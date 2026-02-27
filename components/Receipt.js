'use client';

import React from 'react';
import styles from './Receipt.module.css';

const Receipt = ({ cart, total, discount = 0, tax = 0, taxRate = 5, currency = '₱', onOrderNew, onPrint }) => {
    const now = new Date();
    const dateString = now.toLocaleDateString();
    const timeString = now.toLocaleTimeString();

    return (
        <div className={styles.receiptOverlay}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                <div className={styles.receiptPaper}>
                    <div className={styles.title}>antiPOS Store</div>
                    <div style={{ fontSize: '0.8rem' }}>Branch: Main Street</div>
                    <div style={{ fontSize: '0.8rem' }}>{dateString} {timeString}</div>

                    <div className={styles.divider}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cart.map((item) => (
                            <div key={item.id} className={styles.itemRow}>
                                <span>{item.quantity}x {item.name}</span>
                                <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.itemRow}>
                        <span>Subtotal</span>
                        <span>{currency}{(total - tax).toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                        <div className={styles.itemRow} style={{ color: 'var(--primary)' }}>
                            <span>Discount / Rewards</span>
                            <span>-{currency}{discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className={styles.itemRow}>
                        <span>Tax ({taxRate}%)</span>
                        <span>{currency}{tax.toFixed(2)}</span>
                    </div>

                    <div className={styles.totalRow}>
                        <span>TOTAL</span>
                        <span>{currency}{total.toFixed(2)}</span>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.footer}>
                        <div>Thank you for your visit!</div>
                        <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 800 }}>#ORDER-1234</div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.closeBtn} onClick={onOrderNew}>New Order</button>
                    <button className={styles.printBtn} onClick={onPrint}>Print Receipt</button>
                </div>
            </div>
        </div>
    );
};

export default Receipt;
