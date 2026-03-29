'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetTransactions } from '../../../lib/api';

const TX_STYLE: any = {
  deposit:    { bg: '#dcfce7', color: '#16a34a', label: 'Deposit' },
  commission: { bg: '#fef3c7', color: '#d97706', label: 'Commission' },
  refund:     { bg: '#dbeafe', color: '#2563eb', label: 'Refund' },
  withdrawal: { bg: '#fee2e2', color: '#ef4444', label: 'Withdrawal' },
};

const STATUS_STYLE: any = {
  completed: { bg: '#dcfce7', color: '#16a34a' },
  pending:   { bg: '#fef3c7', color: '#d97706' },
  failed:    { bg: '#fee2e2', color: '#ef4444' },
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetTransactions().then(res => { setTxs(res.data); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? txs : txs.filter(t => t.tx_type === filter);

  const totalRevenue = txs
    .filter(t => t.tx_type === 'commission' && t.status === 'completed')
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <AdminLayout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Transactions</h2>
          <p style={styles.revenue}>Total Commission Revenue: <strong style={{ color: '#16a34a' }}>ETB {totalRevenue.toFixed(2)}</strong></p>
        </div>
        <div style={styles.filterRow}>
          {['all', 'deposit', 'commission', 'refund'].map(f => (
            <button key={f} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-sub)' }}>Loading...</p> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Amount (ETB)</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => {
                const ts = TX_STYLE[tx.tx_type] || TX_STYLE.deposit;
                const ss = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
                return (
                  <tr key={tx.id} style={styles.tr}>
                    <td style={styles.td}>{tx.wallet}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: ts.bg, color: ts.color }}>{ts.label}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: tx.tx_type === 'deposit' ? '#16a34a' : '#d97706' }}>
                      {tx.tx_type === 'deposit' ? '+' : '-'}{tx.amount}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: ss.bg, color: ss.color }}>{tx.status}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: 12, color: 'var(--text-sub)' }}>{tx.reference || '—'}</td>
                    <td style={{ ...styles.td, fontSize: 12, color: 'var(--text-sub)' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p style={{ color: 'var(--text-sub)', padding: 20 }}>No transactions found.</p>}
        </div>
      )}
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  revenue: { fontSize: 14, color: 'var(--text-sub)' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: { padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' },
  filterActive: { background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
  tableWrap: { background: '#fff', borderRadius: 14, overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  thead: { background: 'var(--bg)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 14, verticalAlign: 'middle' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
