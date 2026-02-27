'use client';

import React, { useState, useEffect } from 'react';
import {
    History,
    Search,
    Filter,
    User,
    Calendar,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    AlertCircle,
    Database,
    Tag,
    Edit3,
    Trash2,
    PlusCircle
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

const AuditLogsView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);

    const actionIcons = {
        'CREATE_PRODUCT': <PlusCircle size={16} color="var(--success)" />,
        'UPDATE_PRODUCT': <Edit3 size={16} color="var(--primary)" />,
        'DELETE_PRODUCT': <Trash2 size={16} color="var(--error)" />,
        'CREATE_BRANCH': <PlusCircle size={16} color="var(--success)" />,
        'UPDATE_BRANCH': <Edit3 size={16} color="var(--primary)" />,
        'DELETE_BRANCH': <Trash2 size={16} color="var(--error)" />,
        'ADJUST_STOCK': <Database size={16} color="var(--secondary)" />,
        'SALE_COMPLETED': <ShieldCheck size={16} color="var(--success)" />,
        'DEFAULT': <Tag size={16} color="var(--text-muted)" />
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profiles(full_name, role)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesAction = filterAction === 'All' || log.action === filterAction;
        const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesAction && matchesSearch;
    });

    const uniqueActions = ['All', ...new Set(logs.map(l => l.action))];

    return (
        <div className={styles.dashboardContent}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>System Audit Logs</h1>
                    <p className={styles.subtitle}>Track all administrative actions and system changes.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="glass"
                            style={{ border: 'none', background: 'transparent', padding: 0, width: '150px', fontSize: '0.85rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="glass"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        {uniqueActions.map(action => <option key={action} value={action}>{action}</option>)}
                    </select>
                </div>
            </header>

            <div className="glass" style={{ marginTop: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left' }}>Action</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left' }}>User / Role</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left' }}>Entity</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left' }}>Timestamp</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <History size={18} className="animate-spin" />
                                        Loading Audit History...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                    No audit entries found matching your criteria.
                                </td>
                            </tr>
                        ) : filteredLogs.map((log) => (
                            <React.Fragment key={log.id}>
                                <tr
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer', background: expandedLog === log.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                >
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {actionIcons[log.action] || actionIcons.DEFAULT}
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.action}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {log.profiles?.full_name || 'System'}
                                            <div className="glass" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                {log.profiles?.role || 'Service'}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        {log.entity_type}: {log.entity_id?.slice(0, 8)}...
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '0.8rem' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        {expandedLog === log.id ? <ChevronUp size={16} opacity={0.5} /> : <ChevronDown size={16} opacity={0.5} />}
                                    </td>
                                </tr>
                                {expandedLog === log.id && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Metadata</h4>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                                        <div>Entry ID: {log.id}</div>
                                                        <div>User ID: {log.user_id}</div>
                                                        <div>Entity ID: {log.entity_id}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', marginBottom: '8px' }}>Payload Details</h4>
                                                    <pre style={{
                                                        background: 'rgba(0,0,0,0.3)',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        fontFamily: 'monospace',
                                                        overflowX: 'auto',
                                                        border: '1px solid var(--border-color)'
                                                    }}>
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Showing the most recent {filteredLogs.length} activity logs.</p>
            </div>
        </div>
    );
};

export default AuditLogsView;
