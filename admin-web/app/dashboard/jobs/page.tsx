'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import {
  adminGetJobs, adminApproveJob, adminGetCommission,
  adminDeleteJob, adminBulkDeleteJobs, adminGetExpiredJobs,
  adminAutoCloseExpired, adminReviewExtend,
} from '../../../lib/api';

const STATUS_STYLE: any = {
  draft:           { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft' },
  under_review:    { bg: '#dbeafe', color: '#2563eb',  label: 'Under Review' },
  approved:        { bg: '#fef3c7', color: '#d97706',  label: 'Approved - Awaiting Payment' },
  payment_pending: { bg: '#ede9fe', color: '#7c3aed',  label: 'Payment Pending' },
  published:       { bg: '#dcfce7', color: '#16a34a',  label: 'Published' },
  rejected:        { bg: '#fee2e2', color: '#ef4444',  label: 'Rejected' },
  closed:          { bg: '#f3f4f6', color: '#6b7280',  label: 'Closed' },
};

const EXTEND_STATUS: any = {
  pending:  { bg: '#fef3c7', color: '#d97706', label: '⏳ Extension Requested' },
  fee_set:  { bg: '#ede9fe', color: '#7c3aed', label: '💳 Fee Set - Awaiting Payment' },
  paid:     { bg: '#dcfce7', color: '#16a34a', label: '✅ Extended - Fee Paid' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: '✓ Extension Approved' },
  rejected: { bg: '#fee2e2', color: '#ef4444', label: '✕ Extension Rejected' },
};

function isExpired(job: any) {
  if (!job.deadline) return false;
  return new Date(job.deadline) < new Date(new Date().toDateString());
}

export default function JobsPage() {
  const [jobs, setJobs]           = useState<any[]>([]);
  const [expiredJobs, setExpiredJobs] = useState<any[]>([]);
  const [filter, setFilter]       = useState('draft');
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [fees, setFees]           = useState<Record<number, string>>({});
  const [notes, setNotes]         = useState<Record<number, string>>({});
  const [extFees, setExtFees]     = useState<Record<number, string>>({});
  const [acting, setActing]       = useState<number | null>(null);
  const [defaultFee, setDefaultFee] = useState('');
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [deleting, setDeleting]   = useState(false);
  const [msg, setMsg]             = useState('');

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchJobs = async () => {
    setLoading(true);
    if (filter === 'expired') {
      const res = await adminGetExpiredJobs();
      setExpiredJobs(res.data);
      setJobs([]);
    } else if (filter === 'extend_requests') {
      // Fetch all jobs and filter those with active extension requests
      const res = await adminGetJobs({});
      const withExtend = res.data.filter((j: any) =>
        j.extend_status && j.extend_status !== 'none' && j.extend_status !== 'approved' && j.extend_status !== 'rejected'
      );
      setJobs(withExtend);
      setExpiredJobs([]);
    } else {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await adminGetJobs(params);
      setJobs(res.data);
      setExpiredJobs([]);
    }
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    adminGetCommission().then(res => setDefaultFee(res.data.job_post_fee));
  }, []);

  useEffect(() => { fetchJobs(); }, [filter]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'publish') => {
    const fee = fees[id] || defaultFee;
    if (action === 'approve' && !fee) { alert('Please set the posting fee before approving.'); return; }
    setActing(id);
    try {
      await adminApproveJob(id, { action, note: notes[id] || '', posting_fee: fee || undefined });
      fetchJobs(); setExpanded(null);
    } catch (e: any) { alert(e?.response?.data?.error || 'Action failed'); }
    setActing(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this job permanently?')) return;
    setActing(id);
    try { await adminDeleteJob(id); fetchJobs(); showMsg('Job deleted.'); }
    catch { alert('Delete failed'); }
    setActing(null);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected job(s) permanently?`)) return;
    setDeleting(true);
    try {
      await adminBulkDeleteJobs(Array.from(selected));
      showMsg(`${selected.size} job(s) deleted.`);
      fetchJobs();
    } catch { alert('Bulk delete failed'); }
    setDeleting(false);
  };

  const handleAutoClose = async () => {
    try {
      const res = await adminAutoCloseExpired();
      showMsg(`${res.data.closed} expired job(s) closed.`);
      fetchJobs();
    } catch { alert('Auto-close failed'); }
  };

  const handleExtendAction = async (id: number, action: string) => {
    const fee = extFees[id];
    if (action === 'set_fee' && !fee) { alert('Enter the extension fee first.'); return; }
    setActing(id);
    try {
      await adminReviewExtend(id, { action, extend_fee: fee });
      showMsg(action === 'set_fee' ? 'Extension fee set.' : action === 'approve' ? 'Extension approved.' : 'Extension rejected.');
      fetchJobs();
    } catch (e: any) { alert(e?.response?.data?.error || 'Action failed'); }
    setActing(null);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayJobs = filter === 'expired' ? expiredJobs : jobs;
  const deletableJobs = displayJobs.filter(j => isExpired(j) || j.status === 'closed' || j.status === 'rejected');
  const allDeletableSelected = deletableJobs.length > 0 && deletableJobs.every(j => selected.has(j.id));

  const FILTERS = ['draft', 'under_review', 'approved', 'payment_pending', 'published', 'rejected', 'expired', 'extend_requests', 'all'];

  return (
    <AdminLayout>
      <div style={s.header}>
        <div>
          <h2 style={s.pageTitle}>Job Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>
            Review, approve, delete and manage deadline extensions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.autoCloseBtn} onClick={handleAutoClose}>
            🔒 Auto-Close Expired
          </button>
          {selected.size > 0 && (
            <button style={{ ...s.bulkDeleteBtn, opacity: deleting ? 0.6 : 1 }}
              onClick={handleBulkDelete} disabled={deleting}>
              🗑 Delete Selected ({selected.size})
            </button>
          )}
        </div>
      </div>

      {msg && <div style={s.msgBox}>{msg}</div>}

      {/* Filter tabs */}
      <div style={s.filterRow}>
        {FILTERS.map(f => (
          <button key={f} style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
            onClick={() => setFilter(f)}>
            {f === 'expired' ? '⏰ Expired' : f === 'all' ? 'All' : f === 'extend_requests' ? '📅 Extension Requests' : STATUS_STYLE[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Bulk select bar — only show when there are deletable jobs */}
      {deletableJobs.length > 0 && (
        <div style={s.bulkBar}>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={allDeletableSelected}
              onChange={() => {
                if (allDeletableSelected) {
                  setSelected(prev => { const n = new Set(prev); deletableJobs.forEach(j => n.delete(j.id)); return n; });
                } else {
                  setSelected(prev => { const n = new Set(prev); deletableJobs.forEach(j => n.add(j.id)); return n; });
                }
              }} />
            <span>Select all deletable ({deletableJobs.length})</span>
          </label>
          {selected.size > 0 && (
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>
              {selected.size} selected
            </span>
          )}
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-sub)' }}>Loading...</p> : (
        <div style={s.list}>
          {displayJobs.length === 0 && (
            <div style={s.emptyBox}>
              {filter === 'expired' ? '✅ No expired jobs.' : 'No jobs found.'}
            </div>
          )}
          {displayJobs.map(job => {
            const st = STATUS_STYLE[job.status] || STATUS_STYLE.draft;
            const isOpen = expanded === job.id;
            const expired = isExpired(job);
            const isDeletable = expired || job.status === 'closed' || job.status === 'rejected';
            const hasExtendReq = job.extend_status && job.extend_status !== 'none';
            const extSt = hasExtendReq ? EXTEND_STATUS[job.extend_status] : null;

            return (
              <div key={job.id} style={{ ...s.card, ...(expired ? s.cardExpired : {}) }}>
                <div style={s.cardTop}>
                  {/* Checkbox — only for deletable */}
                  {isDeletable && (
                    <input type="checkbox" checked={selected.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()} />
                  )}

                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : job.id)}>
                    <div style={s.jobTitle}>
                      {job.title}
                      {expired && <span style={s.expiredBadge}>⏰ DEADLINE REACHED</span>}
                    </div>
                    <div style={s.meta}>
                      <span>By: {job.posted_by?.username}</span>
                      <span>{job.location}</span>
                      <span>{job.industry}</span>
                      <span>{job.job_type}</span>
                      <span>📅 {job.deadline || 'No deadline'}</span>
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    {extSt && (
                      <span style={{ ...s.badge, background: extSt.bg, color: extSt.color, marginTop: 4, display: 'inline-block' }}>
                        {extSt.label}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...s.badge, background: st.bg, color: st.color }}>{st.label}</span>
                    {job.posting_fee && (
                      <span style={{ ...s.badge, background: '#dcfce7', color: '#16a34a' }}>
                        ETB {job.posting_fee}
                      </span>
                    )}
                    {/* Delete button always visible */}
                    <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(job.id); }}
                      disabled={acting === job.id} title="Delete job">
                      🗑
                    </button>
                    <span style={{ fontSize: 16, color: 'var(--text-sub)', cursor: 'pointer' }}
                      onClick={() => setExpanded(isOpen ? null : job.id)}>
                      {isOpen ? '▲' : '▼'}
                    </span>
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
                        <div style={{ ...s.detailValue, color: expired ? '#ef4444' : 'inherit' }}>
                          {job.deadline ? `${job.deadline}${expired ? ' ⏰ EXPIRED' : ''}` : 'No deadline set'}
                        </div>
                        {job.posting_fee && <>
                          <div style={s.detailLabel}>Posting Fee</div>
                          <div style={s.detailValue}>ETB {job.posting_fee}</div>
                        </>}
                      </div>
                    </div>

                    {job.admin_note && (
                      <div style={s.noteBox}><strong>Previous note:</strong> {job.admin_note}</div>
                    )}

                    {/* ── Extension request section ── */}
                    {hasExtendReq && (
                      <div style={s.extendBox}>
                        <div style={s.extendTitle}>📅 Deadline Extension Request</div>
                        <div style={s.extendInfo}>
                          <span>Current deadline: <strong>{job.deadline || 'None'}</strong></span>
                          <span>→ Requested new deadline: <strong style={{ color: '#0369a1' }}>{job.extend_new_deadline || 'N/A'}</strong></span>
                          <span>Status: <strong>{job.extend_status}</strong></span>
                          {job.extend_fee && <span>Fee: <strong>ETB {job.extend_fee}</strong></span>}
                        </div>

                        {job.extend_status === 'pending' && (
                          <div style={s.extendActions}>
                            <div style={s.feeRow}>
                              <label style={s.feeLabel}>Extension Fee (ETB) *</label>
                              <input style={s.feeInput} type="number" min="0"
                                placeholder={defaultFee || 'e.g. 50'}
                                value={extFees[job.id] || ''}
                                onChange={e => setExtFees(f => ({ ...f, [job.id]: e.target.value }))} />
                            </div>
                            <div style={s.btnRow}>
                              <button style={s.approveBtn} disabled={acting === job.id}
                                onClick={() => handleExtendAction(job.id, 'set_fee')}>
                                ✓ Set Fee & Notify Employer
                              </button>
                              <button style={s.rejectBtn} disabled={acting === job.id}
                                onClick={() => handleExtendAction(job.id, 'reject')}>
                                ✕ Reject Extension
                              </button>
                            </div>
                          </div>
                        )}

                        {job.extend_status === 'paid' && (
                          <div style={{ ...s.noteBox, background: '#dcfce7', borderColor: '#86efac', marginTop: 8 }}>
                            ✅ Extension fee paid — deadline has been automatically extended to <strong>{job.extend_new_deadline}</strong>.
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Job approval actions ── */}
                    {['draft', 'under_review', 'approved', 'payment_pending'].includes(job.status) && (
                      <div style={s.actionArea}>
                        <div style={s.feeRow}>
                          <label style={s.feeLabel}>Posting Fee (ETB) *</label>
                          <input style={s.feeInput} type="number" min="0" step="1"
                            placeholder={defaultFee ? `Default: ${defaultFee}` : 'e.g. 100'}
                            value={fees[job.id] ?? (job.posting_fee || defaultFee)}
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

                    {job.status === 'published' && !expired && (
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
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  pageTitle:    { fontSize: 22, fontWeight: 800, color: 'var(--text)' },
  filterRow:    { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  filterBtn:    { padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', background: '#fff', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer' },
  filterActive: { background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
  bulkBar:      { display: 'flex', alignItems: 'center', gap: 16, background: '#f8f8ff', borderRadius: 10, padding: '8px 14px', marginBottom: 10, border: '1px solid #e0e7ff' },
  checkLabel:   { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  autoCloseBtn: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  bulkDeleteBtn:{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  msgBox:       { background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 12, color: '#15803d', fontWeight: 600, fontSize: 13 },
  emptyBox:     { padding: 32, textAlign: 'center', color: 'var(--text-sub)', fontSize: 15 },
  list:         { display: 'flex', flexDirection: 'column', gap: 10 },
  card:         { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' },
  cardExpired:  { border: '1.5px solid #fca5a5', background: '#fff8f8' },
  cardTop:      { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' },
  jobTitle:     { fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  expiredBadge: { fontSize: 11, fontWeight: 800, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 20, border: '1px solid #fca5a5' },
  meta:         { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-sub)' },
  badge:        { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' as const },
  deleteBtn:    { padding: '5px 10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff8f8', color: '#ef4444', cursor: 'pointer', fontSize: 14 },
  detail:       { padding: '0 18px 18px', borderTop: '1px solid var(--border)' },
  detailGrid:   { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 14, marginBottom: 14 },
  detailLabel:  { fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 3, marginTop: 8 },
  detailText:   { fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const },
  detailValue:  { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  noteBox:      { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 12 },
  extendBox:    { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 14, marginBottom: 14 },
  extendTitle:  { fontSize: 13, fontWeight: 800, color: '#0369a1', marginBottom: 8 },
  extendInfo:   { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#374151', marginBottom: 10 },
  extendActions:{ display: 'flex', flexDirection: 'column', gap: 8 },
  actionArea:   { borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  feeRow:       { display: 'flex', alignItems: 'center', gap: 12 },
  feeLabel:     { fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', minWidth: 180 },
  feeInput:     { flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--bg)' },
  btnRow:       { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  approveBtn:   { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  publishBtn:   { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  rejectBtn:    { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
};
