'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetJobs, adminApproveJob } from '../../../lib/api';

const STATUS_STYLE: any = {
  draft:           { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft' },
  under_review:    { bg: '#dbeafe', color: '#2563eb',  label: 'Under Review' },
  approved:        { bg: '#fef3c7', color: '#d97706',  label: 'Approved - Awaiting Payment' },
  payment_pending: { bg: '#ede9fe', color: '#7c3aed',  label: 'Payment Pending' },
  published:       { bg: '#dcfce7', color: '#16a34a',  label: 'Published' },
  rejected:        { bg: '#fee2e2', color: '#ef4444',  label: 'Rejected' },
  closed:          { bg: '#f3f4f6', color: '#6b7280',  label: 'Closed' },
};

export default function JobsPage() {
  const [jobs, setJobs]       = useState<any[]>([]);
  const [filter, setFilter]   = useState('draft');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fees, setFees]       = useState<Record<number, string>>({});
  const [notes, setNotes]     = useState<Record<number, string>>({});
  const [acting, setActing]   = useState<number | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    const params = filter !== 'all' ? { status: filter } : {};
    const res = await adminGetJobs(params);
    setJobs(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [filter]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'publish') => {
    if (action === 'approve' && !fees[id]) {
      alert('Please set the posting fee before approving.');
      return;
    }
    setActing(id);
    try {
      await adminApproveJob(id, {
        action,
        note: notes[id] || '',
        posting_fee: fees[id] || undefined,
      });
      fetchJobs();
      setExpanded(null);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Action failed');
    }
    setActing(null);
  };

  const FILTERS = ['draft', 'under_review', 'approved', 'payment_pending', 'published', 'rejected', 'all'];

  return (
    <AdminLayout>
      <div style={s.header}>
        <h2 style={s.pageTitle}>Job Requests</h2>
        <div style={s.filterRow}>
          {FILTERS.map(f => (
            <button key={f} style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : STATUS_STYLE[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-sub)' }}>Loading...</p> : (
        <div style={s.list}>
          {jobs.length === 0 && <p style={{ color: 'var(--text-sub)' }}>No jobs found.</p>}
          {jobs.map(job => {
            const st = STATUS_STYLE[job.status] || STATUS_STYLE.draft;
            const isOpen = expanded === job.id;
            return (
              <div key={job.id} style={s.card}>
                <div style={s.cardTop} onClick={() => setExpanded(isOpen ? null : job.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={s.jobTitle}>{job.title}</div>
                    <div style={s.meta}>
                      <span>By: {job.posted_by?.username}</span>
                      <span>{job.location}</span>
                      <span>{job.industry}</span>
                      <span>{job.job_type}</span>
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...s.badge, background: st.bg, color: st.color }}>{st.label}</span>
                    {job.posting_fee && (
                      <span style={{ ...s.badge, background: '#dcfce7', color: '#16a34a' }}>
                        ETB {job.posting_fee}
                      </span>
                    )}
                    <span style={{ fontSize: 18, color: 'var(--text-sub)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={s.detail}>
                    <div style={s.detailGrid}>
                      <div>
                        <div style={s.detailLabel}>Description</div>
                        <div style={s.detailText}>{job.description}</div>
                      </div>
                      <div>
                        <div style={s.detailLabel}>Skill Level</div>
                        <div style={s.detailValue}>{job.skill_level}</div>
                        <div style={s.detailLabel}>Salary</div>
                        <div style={s.detailValue}>{job.salary || 'Not specified'}</div>
                        <div style={s.detailLabel}>Deadline</div>
                        <div style={s.detailValue}>{job.deadline || 'No deadline'}</div>
                      </div>
                    </div>

                    {job.admin_note && (
                      <div style={s.noteBox}>
                        <strong>Previous note:</strong> {job.admin_note}
                      </div>
                    )}

                    {['draft', 'under_review', 'approved', 'payment_pending'].includes(job.status) && (
                      <div style={s.actionArea}>
                        <div style={s.feeRow}>
                          <label style={s.feeLabel}>Posting Fee (ETB) *</label>
                          <input style={s.feeInput} type="number" min="0" step="1"
                            placeholder="e.g. 100"
                            value={fees[job.id] || job.posting_fee || ''}
                            onChange={e => setFees(f => ({ ...f, [job.id]: e.target.value }))} />
                        </div>
                        <div style={s.feeRow}>
                          <label style={s.feeLabel}>Note to employer (optional)</label>
                          <input style={s.feeInput} placeholder="Reason for approval/rejection..."
                            value={notes[job.id] || ''}
                            onChange={e => setNotes(n => ({ ...n, [job.id]: e.target.value }))} />
                        </div>
                        <div style={s.btnRow}>
                          <button style={{ ...s.approveBtn, opacity: acting === job.id ? 0.6 : 1 }}
                            disabled={acting === job.id} onClick={() => handleAction(job.id, 'approve')}>
                            Approve & Set Fee
                          </button>
                          <button style={{ ...s.publishBtn, opacity: acting === job.id ? 0.6 : 1 }}
                            disabled={acting === job.id} onClick={() => handleAction(job.id, 'publish')}>
                            Publish Directly
                          </button>
                          <button style={{ ...s.rejectBtn, opacity: acting === job.id ? 0.6 : 1 }}
                            disabled={acting === job.id} onClick={() => handleAction(job.id, 'reject')}>
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {job.status === 'published' && (
                      <div style={{ ...s.noteBox, background: '#dcfce7', borderColor: '#bbf7d0' }}>
                        Published on {job.published_at ? new Date(job.published_at).toLocaleString() : 'N/A'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

const s: Record<string, React.CSSProperties> = {
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 22, fontWeight: 800, color: 'var(--text)' },
  filterRow:   { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn:   { padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', background: '#fff', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer' },
  filterActive:{ background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
  list:        { display: 'flex', flexDirection: 'column', gap: 12 },
  card:        { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' },
  cardTop:     { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' },
  jobTitle:    { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  meta:        { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-sub)' },
  badge:       { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const },
  detail:      { padding: '0 20px 20px', borderTop: '1px solid var(--border)' },
  detailGrid:  { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 16, marginBottom: 16 },
  detailLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4, marginTop: 10 },
  detailText:  { fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const },
  detailValue: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  noteBox:     { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 14 },
  actionArea:  { borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column' as const, gap: 10 },
  feeRow:      { display: 'flex', alignItems: 'center', gap: 12 },
  feeLabel:    { fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', minWidth: 180 },
  feeInput:    { flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--bg)' },
  btnRow:      { display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginTop: 4 },
  approveBtn:  { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  publishBtn:  { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  rejectBtn:   { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
};
