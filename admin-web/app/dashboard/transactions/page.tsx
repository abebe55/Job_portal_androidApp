'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetTransactions } from '../../../lib/api';

/* ─── config ─────────────────────────────────────────────── */
const TX_CFG: Record<string, { bg: string; color: string; label: string; amountColor: string }> = {
  deposit:    { bg: '#dcfce7', color: '#16a34a', label: 'Deposit',    amountColor: '#16a34a' },
  commission: { bg: '#fef3c7', color: '#d97706', label: 'Commission', amountColor: '#d97706' },
  refund:     { bg: '#dbeafe', color: '#2563eb', label: 'Refund',     amountColor: '#2563eb' },
  withdrawal: { bg: '#fee2e2', color: '#ef4444', label: 'Withdrawal', amountColor: '#ef4444' },
};

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#dcfce7', color: '#16a34a' },
  pending:   { bg: '#fef3c7', color: '#d97706' },
  failed:    { bg: '#fee2e2', color: '#ef4444' },
};

const FILTERS = ['all', 'deposit', 'commission', 'refund', 'withdrawal'] as const;
type Filter = typeof FILTERS[number];

/* ─── summary card ────────────────────────────────────────── */
function SumCard({ label, value, iconBg, icon }: {
  label: string; value: string | number; iconBg: string; icon: React.ReactNode;
}) {
  return (
    <div style={sc.card}>
      <div style={{ ...sc.icon, background: iconBg }}>{icon}</div>
      <div style={sc.value}>{value}</div>
      <div style={sc.label}>{label}</div>
    </div>
  );
}
const sc: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
    padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8,
  },
  icon: { width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  label: { fontSize: 12, color: 'var(--text-sub)', fontWeight: 500 },
};

/* ─── Page ────────────────────────────────────────────────── */
export default function TransactionsPage() {
  const [txs, setTxs]       = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminGetTransactions().then(res => { setTxs(res.data); setLoading(false); });
  }, []);

  const filtered = txs.filter(t => {
    const matchType   = filter === 'all' || t.tx_type === filter;
    const matchSearch = !search ||
      String(t.wallet ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.reference ?? '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  /* summary stats */
  const totalRevenue   = txs.filter(t => t.tx_type === 'commission' && t.status === 'completed').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalDeposits  = txs.filter(t => t.tx_type === 'deposit'    && t.status === 'completed').reduce((s, t) => s + parseFloat(t.amount), 0);
  const pendingCount   = txs.filter(t => t.status === 'pending').length;
  const completedCount = txs.filter(t => t.status === 'completed').length;

  return (
    <AdminLayout>

      {/* ── Page header ── */}
      <div style={p.pageHeader}>
        <div>
          <h1 style={p.pageTitle}>Transactions</h1>
          <p style={p.pageSub}>Full record of all wallet movements across the platform</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={p.sumGrid}>
        <SumCard
          label="Commission Revenue"
          value={`ETB ${totalRevenue.toFixed(2)}`}
          iconBg="#dcfce7"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <SumCard
          label="Total Deposits"
          value={`ETB ${totalDeposits.toFixed(2)}`}
          iconBg="#dbeafe"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>}
        />
        <SumCard
          label="Completed"
          value={completedCount}
          iconBg="#f0eeff"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <SumCard
          label="Pending"
          value={pendingCount}
          iconBg="#fef3c7"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* ── Toolbar ── */}
      <div style={p.toolBar}>
        {/* Search */}
        <div style={p.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={p.searchInput}
            placeholder="Search by user or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={p.clearBtn} onClick={() => setSearch('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f}
              style={{ ...p.filterBtn, ...(filter === f ? p.filterActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <span style={p.countBadge}>{filtered.length} records</span>
      </div>

      {/* ── Table ── */}
      <div style={p.tableCard}>
        {loading ? (
          <div style={p.loadingBox}>
            <div style={p.spinner} />
            <p style={{ marginTop: 12, color: 'var(--text-sub)', fontWeight: 500 }}>Loading transactions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={p.emptyBox}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-sub)' }}>No transactions found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={p.table}>
              <thead>
                <tr>
                  <th style={p.th}>User / Wallet</th>
                  <th style={p.th}>Type</th>
                  <th style={p.th}>Amount</th>
                  <th style={p.th}>Status</th>
                  <th style={p.th}>Reference</th>
                  <th style={p.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const tc = TX_CFG[tx.tx_type]     ?? TX_CFG.deposit;
                  const sc2 = STATUS_CFG[tx.status] ?? STATUS_CFG.pending;
                  const isInflow = tx.tx_type === 'deposit' || tx.tx_type === 'refund';

                  return (
                    <tr key={tx.id} style={p.tr}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      {/* User */}
                      <td style={p.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={p.walletAvatar}>
                            {String(tx.wallet ?? '?')[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {tx.wallet ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td style={p.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={p.td}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: tc.amountColor }}>
                          {isInflow ? '+' : '−'} ETB {parseFloat(tx.amount).toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={p.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, background: sc2.bg, color: sc2.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </td>

                      {/* Reference */}
                      <td style={p.td}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {tx.reference || '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={p.td}>
                        <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const p: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  pageSub:    { fontSize: 14, color: 'var(--text-sub)' },

  sumGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: 16, marginBottom: 20,
  },

  toolBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    flexWrap: 'wrap', marginBottom: 16,
  },

  searchWrap: {
    position: 'relative', flex: 1, minWidth: 220,
    display: 'flex', alignItems: 'center',
  },
  searchInput: {
    width: '100%', paddingTop: 10, paddingBottom: 10,
    paddingLeft: 36, paddingRight: 32,
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)',
    fontSize: 14, color: 'var(--text)',
    background: 'var(--surface)', outline: 'none',
  },
  clearBtn: {
    position: 'absolute', right: 10,
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
  },

  filterBtn: {
    padding: '7px 14px', borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
  },
  filterActive: {
    background: 'var(--primary)', color: '#fff',
    border: '1.5px solid var(--primary)',
  },

  countBadge: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-sub)',
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '7px 14px', border: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },

  tableCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  },

  loadingBox: { padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  spinner:    { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%' },
  emptyBox:   { padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' },

  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: 'var(--bg)', borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    transition: 'background var(--transition-fast)',
  },
  td: { padding: '13px 16px', fontSize: 13, verticalAlign: 'middle' },

  walletAvatar: {
    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 13,
  },
};
