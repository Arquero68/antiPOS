'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            window.location.href = '/';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            padding: '20px'
        }}>
            <div className="glass" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '16px',
                    borderRadius: '20px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary)',
                    marginBottom: '24px'
                }}>
                    <ShieldCheck size={40} />
                </div>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>Staff Access</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Enter your credentials to access antiPOS</p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                required
                                type="email"
                                className="glass"
                                style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(255,255,255,0.02)' }}
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                required
                                type="password"
                                className="glass"
                                style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(255,255,255,0.02)' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="glass"
                        style={{
                            padding: '14px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Secure Login'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            localStorage.setItem('dev_bypass', 'true');
                            window.location.href = '/';
                        }}
                        style={{
                            marginTop: '12px',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            padding: '10px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Bypass Login (Development Only)
                    </button>
                </form>

                <p style={{ marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Having trouble? Contact your system administrator.
                </p>
            </div>
        </div>
    );
}
