'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminGetJobs, adminGetUsers, adminGetTransactions, adminGetCommission } from '../../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ jobs: 0, pending: 0, users: 0, employers: 0, revenue: 0, fee: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGetJobs(),
      adminGetUsers(),
      adminGetTransactions(),
      adminGetCommission(),
    ]).then(([jobs, users, txs, commission]) => {
      const allJobs = jobs.data;
      const allUsers = users.data;
      const allTxs = txs.data;
      const revenue = allTxs
        .filter((t: any) => t.tx_type === 'commission' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
      setStats({
        jobs: allJobs.length,
        pending: allJobs.filter((j: any) => !j.is_approved).length,
        users: allUsers.length,
        employers: allUsers.filter((u: any) => u.role === 'employer').length,
        revenue,
        fee: parseFloat(commission.data.job_post_fee),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Jobs', value: stats.jobs, icon: 'Jobs', color: '#1a73e8' },
    { label: 'Pending Approval', value: stats.pending, icon: 'Pending', color: '#f59e0b' },
    { label: 'Total Users', value: stats.users, icon: 'Users', color: '#22c55e' },
    { label: 'Employers', value: stats.employers, icon: 'Employers', color: '#a855f7' },
    { label: 'Total Revenue (ETB)', value: `${stats.revenue.toFixed(2)}`, icon: 'Revenue', color: '#ef4444' },
    { label: 'Job Post Fee (ETB)', value: `${stats.fee}`, icon: 'Fee', color: '#3b82f6' },
  ];

  return (
    <AdminLayout>
      <h2 style={styles.pageTitle}>Dashboard</h2>
      {loading ? <p style={{ color: 'var(--text-sub)' }}>Loading...</p> : (
        <div style={styles.grid}>
          {cards.map(c => (
            <div key={c.label} style={styles.card}>
              <div style={{ fontSize: 10, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.value}</div>
              <div style={styles.cardLabel}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--text)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 },
  card: {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 14,
    padding: '18px 16px',
    boxShadow: '0 4px 20px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    border: '1px solid rgba(255,255,255,0.9)',
  },
  cardLabel: { fontSize: 12, color: 'var(--text-sub)', fontWeight: 700 },
};
