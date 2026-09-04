'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminGetJobs, adminGetUsers, adminGetTransactions, adminGetCommission } from '../../lib/api';

/* ─── Stat card ───────────────────────────────────────────── */
function StatCard({
  label, value, iconBg, icon, trend,
}: {
  label: string;
  value: string | number;
  iconBg: string;
  icon: React.ReactNode;
  trend?: { label: string; up: boolean };
}) {
  return (
    <div className="jp-stat-card">
      <div style={sc.cardTop}>
        <div className="jp-icon-tile" style={{ background: iconBg }}>{icon}</div>
        {trend && (
          <span style={{ ...sc.trend, color: trend.up ? '#10b981' : '#ef4444' }}>
            {trend.up ? '↑' : '↓'} {trend.label}
          </span>
        )}
      </div>
      <div style={sc.value}>{value}</div>
      <div style={sc.label}>{label}</div>
    </div>
  );
}

const sc: Record<string, React.CSSProperties> = {
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  trend: { fontSize: 12, fontWeight: 600, marginTop: 4 },
  value: { fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.02em' },
  label: { fontSize: 12, color: 'var(--text-sub)', fontWeight: 500 },
};

/* ─── Section card wrapper ────────────────────────────────── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="jp-card-static">
      <div className="jp-card-head">{title}</div>
      {children}
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────── */
function Skeleton({ h = 28, w = '100%' }: { h?: number; w?: string | number }) {
  return (
    <div style={{
      height: h, width: w,
      borderRadius: 'var(--radius-md)',
      background: 'linear-gradient(90deg, #f0f0f4 25%, #e8e8f0 50%, #f0f0f4 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [stats, setStats] = useState({
    jobs: 0, pending: 0, users: 0, employers: 0, jobSeekers: 0,
    revenue: 0, fee: 0, published: 0,
  });
  const [recentJobs, setRecentJobs]   = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGetJobs(),
      adminGetUsers(),
      adminGetTransactions(),
      adminGetCommission(),
    ]).then(([jobs, users, txs, commission]) => {
      const allJobs  = jobs.data  as any[];
      const allUsers = users.data as any[];
      const allTxs   = txs.data   as any[];

      const revenue = allTxs
        .filter((t: any) => t.tx_type === 'commission' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      setStats({
        jobs:       allJobs.length,
        pending:    allJobs.filter((j: any) => !j.is_approved && j.status !== 'rejected').length,
        published:  allJobs.filter((j: any) => j.status === 'published').length,
        users:      allUsers.length,
        employers:  allUsers.filter((u: any) => u.role === 'employer').length,
        jobSeekers: allUsers.filter((u: any) => u.role === 'jobseeker').length,
        revenue,
        fee: parseFloat(commission.data.job_post_fee),
      });

      /* most recent 5 */
      setRecentJobs([...allJobs].slice(0, 5));
      setRecentUsers([...allUsers].slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* ── stat cards config ── */
  const cards = [
    {
      label: 'Total Jobs',
      value: stats.jobs,
      iconBg: '#f0eeff',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    },
    {
      label: 'Pending Approval',
      value: stats.pending,
      iconBg: '#fffbeb',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      trend: stats.pending > 0 ? { label: 'needs review', up: false } : undefined,
    },
    {
      label: 'Published Jobs',
      value: stats.published,
      iconBg: '#f0fdf4',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: 'Total Users',
      value: stats.users,
      iconBg: '#eff6ff',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      label: 'Employers',
      value: stats.employers,
      iconBg: '#fdf4ff',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      label: 'Job Seekers',
      value: stats.jobSeekers,
      iconBg: '#fff0f6',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
    {
      label: 'Commission Revenue',
      value: `ETB ${stats.revenue.toFixed(2)}`,
      iconBg: '#f0fdf4',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      trend: stats.revenue > 0 ? { label: 'earned', up: true } : undefined,
    },
    {
      label: 'Job Post Fee',
      value: `ETB ${stats.fee}`,
      iconBg: '#fff7ed',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
    },
  ];

  /* ── status badge helper ── */
  const statusCfg: Record<string, { bg: string; color: string; label: string }> = {
    draft:           { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
    under_review:    { bg: '#dbeafe', color: '#2563eb', label: 'Under Review' },
    approved:        { bg: '#fef3c7', color: '#d97706', label: 'Approved' },
    payment_pending: { bg: '#ede9fe', color: '#7c3aed', label: 'Payment Pending' },
    published:       { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
    rejected:        { bg: '#fee2e2', color: '#ef4444', label: 'Rejected' },
    closed:          { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
  };

  const roleCfg: Record<string, { bg: string; color: string }> = {
    jobseeker: { bg: '#ede9fe', color: '#7c3aed' },
    employer:  { bg: '#dbeafe', color: '#2563eb' },
    admin:     { bg: '#fef3c7', color: '#d97706' },
  };

  return (
    <AdminLayout>
      {/* ── Stat cards grid ── */}
      <div style={p.statsGrid}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="jp-stat-card">
                <Skeleton h={44} w={44} />
                <Skeleton h={28} w="60%" />
                <Skeleton h={14} w="80%" />
              </div>
            ))
          : cards.map(c => (
              <StatCard key={c.label} {...c} />
            ))
        }
      </div>

      {/* ── Two-column section ── */}
      <div className="jp-two-col" style={p.twoCol}>

        {/* Recent jobs */}
        <SectionCard title="Recent Jobs">
          {loading ? (
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={20} />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <p style={p.empty}>No jobs yet.</p>
          ) : (
            <div>
              {recentJobs.map((job, i) => {
                const st = statusCfg[job.status] ?? statusCfg.draft;
                return (
                  <div key={job.id} className="jp-list-row">
                    <div style={p.listMain}>
                      <span style={p.listTitle}>{job.title}</span>
                      <span style={p.listMeta}>{job.posted_by?.username ?? '—'} · {job.location ?? '—'}</span>
                    </div>
                    <span style={{ ...p.badge, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent users */}
        <SectionCard title="Recent Users">
          {loading ? (
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={20} />)}
            </div>
          ) : recentUsers.length === 0 ? (
            <p style={p.empty}>No users yet.</p>
          ) : (
            <div>
              {recentUsers.map((user, i) => {
                const rc = roleCfg[user.role] ?? roleCfg.jobseeker;
                return (
                  <div key={user.id} className="jp-list-row">
                    <div style={p.avatarRow}>
                      <div style={p.avatar}>{user.username?.[0]?.toUpperCase() ?? '?'}</div>
                      <div style={p.listMain}>
                        <span style={p.listTitle}>{user.username}</span>
                        <span style={p.listMeta}>{user.email}</span>
                      </div>
                    </div>
                    <span style={{ ...p.badge, background: rc.bg, color: rc.color }}>{user.role}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

      </div>
    </AdminLayout>
  );
}

/* ─── Page-level styles ───────────────────────────────────── */
const p: Record<string, React.CSSProperties> = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 18,
  },

  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },

  avatarRow: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff, #5a52d5)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  listMain: {
    display: 'flex', flexDirection: 'column', gap: 2,
    flex: 1, minWidth: 0,
  },
  listTitle: {
    fontSize: 14, fontWeight: 600, color: 'var(--text)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  listMeta:  { fontSize: 12, color: 'var(--text-muted)' },

  badge: {
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: 11, fontWeight: 700,
    flexShrink: 0, whiteSpace: 'nowrap',
  },

  empty: { padding: '20px 22px', color: 'var(--text-muted)', fontSize: 14 },
};
