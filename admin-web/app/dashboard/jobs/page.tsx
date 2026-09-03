'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import {
  adminGetJobs, adminApproveJob, adminGetCommission,
  adminDeleteJob, adminBulkDeleteJobs, adminGetExpiredJobs,
  adminAutoCloseExpired, adminReviewExtend,
} from '../../../lib/api';

/* ─── status / extend config ─────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  draft:           { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft' },
  under_review:    { bg: '#dbeafe', color: '#2563eb',  label: 'Under Review' },
  approved:        { bg: '#fef3c7', color: '#d97706',  label: 'Approved' },
  payment_pending: { bg: '#ede9fe', color: '#7c3aed',  label: 'Payment Pending' },
  published:       { bg: '#dcfce7', color: '#16a34a',  label: 'Published' },
  rejected:        { bg: '#fee2e2', color: '#ef4444',  label: 'Rejected' },
  closed:          { bg: '#f3f4f6', color: '#6b7280',  label: 'Closed' },
};

const EXTEND_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef3c7', color: '#d97706', label: 'Extension Requested' },
  fee_set:  { bg: '#ede9fe', color: '#7c3aed', label: 'Fee Set – Awaiting Payment' },
  paid:     { bg: '#dcfce7', color: '#16a34a', label: 'Extended – Fee Paid' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'Extension Approved' },
  rejected: { bg: '#fee2e2', color: '#ef4444', label: 'Extension Rejected' },
};

const FILTERS = [
  'draft', 'under_review', 'approved', 'payment_pending',
  'published', 'rejected', 'expired', 'extend_requests', 'all',
];

function filterLabel(f: string) {
  if (f === 'expired') return 'Expired';
  if (f === 'all') return 'All';
  if (f === 'extend_requests') return 'Extensions';
  return STATUS_CFG[f]?.label ?? f;
}

function isExpired(job: any) {
  if (!job.deadline) return false;
  return new Date(job.deadline) < new Date(new Date().toDateString());
}

/* ─── small reusable pieces ──────────────────────────────── */
function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' as const }}>
      {children}
    </span>
  );
}

function Alert({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  const isOk = type === 'success';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 500, background: isOk ? '#dcfce7' : '#fee2e2', border: `1px solid ${isOk ? '#86efac' : '#fca5a5'}`, color: isOk ? '#15803d' : '#b91c1c' }}>
      <span>{isOk ? '✓' : '✕'} {msg}</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.7 }} onClick={onClose}>✕</button>
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, color = 'primary',
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; color?: 'primary' | 'success' | 'danger' | 'warning' | 'purple' | 'gray' }) {
  const map = {
    primary: { bg: '#ffffff', color: '#1d4ed8',  border: '#93c5fd' },
    success: { bg: '#ffffff', color: '#15803d',  border: '#86efac' },
    danger:  { bg: '#ffffff', color: '#b91c1c',  border: '#fca5a5' },
    warning: { bg: '#ffffff', color: '#b45309',  border: '#fcd34d' },
    purple:  { bg: '#ffffff', color: '#6d28d9',  border: '#c4b5fd' },
    gray:    { bg: '#ffffff', color: '#374151',  border: '#e5e7eb' },
  };
  const c = map[color];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="jp-btn"
      style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}
    >
      {children}
    </button>
  );
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', minWidth: 180, flexShrink: 0 }}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1 }}
        className="jp-input"
      />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function JobsPage() {
  const [jobs, setJobs]               = useState<any[]>([]);
  const [expiredJobs, setExpiredJobs] = useState<any[]>([]);
  const [filter, setFilter]           = useState('draft');
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [fees, setFees]               = useState<Record<number, string>>({});
  const [notes, setNotes]             = useState<Record<number, string>>({});
  const [extFees, setExtFees]         = useState<Record<number, string>>({});
  const [acting, setActing]           = useState<number | null>(null);
  const [defaultFee, setDefaultFee]   = useState('');
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [deleting, setDeleting]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  const showMsg = (m: string, isErr = false) => {
    if (isErr) { setErrorMsg(m); setTimeout(() => setErrorMsg(''), 4000); }
    else        { setSuccessMsg(m); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      if (filter === 'expired') {
        const res = await adminGetExpiredJobs();
        setExpiredJobs(res.data); setJobs([]);
      } else if (filter === 'extend_requests') {
        const res = await adminGetJobs({});
        const withExt = (res.data as any[]).filter((j: any) =>
          j.extend_status && j.extend_status !== 'none' && j.extend_status !== 'approved' && j.extend_status !== 'rejected'
        );
        setJobs(withExt); setExpiredJobs([]);
      } else {
        const params = filter !== 'all' ? { status: filter } : {};
        const res = await adminGetJobs(params);
        setJobs(res.data); setExpiredJobs([]);
      }
    } catch { /* silent */ }
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { adminGetCommission().then(r => setDefaultFee(r.data.job_post_fee)); }, []);
  useEffect(() => { fetchJobs(); }, [filter]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'publish') => {
    const fee = fees[id] || defaultFee;
    if (action === 'approve' && !fee) { showMsg('Set the posting fee before approving.', true); return; }
    setActing(id);
    try {
      await adminApproveJob(id, { action, note: notes[id] || '', posting_fee: fee || undefined });
      showMsg(`Job ${action}d successfully.`);
      fetchJobs(); setExpanded(null);
    } catch (e: any) { showMsg(e?.response?.data?.error || 'Action failed.', true); }
    setActing(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this job permanently? This cannot be undone.')) return;
    setActing(id);
    try { await adminDeleteJob(id); showMsg('Job deleted.'); fetchJobs(); }
    catch { showMsg('Delete failed.', true); }
    setActing(null);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} job(s)?`)) return;
    setDeleting(true);
    try {
      await adminBulkDeleteJobs(Array.from(selected));
      showMsg(`${selected.size} job(s) deleted.`); fetchJobs();
    } catch { showMsg('Bulk delete failed.', true); }
    setDeleting(false);
  };

  const handleAutoClose = async () => {
    try {
      const res = await adminAutoCloseExpired();
      showMsg(`${res.data.closed} expired job(s) closed.`); fetchJobs();
    } catch { showMsg('Auto-close failed.', true); }
  };

  const handleExtendAction = async (id: number, action: string) => {
    const fee = extFees[id];
    if (action === 'set_fee' && !fee) { showMsg('Enter the extension fee first.', true); return; }
    setActing(id);
    try {
      await adminReviewExtend(id, { action, extend_fee: fee });
      showMsg(action === 'set_fee' ? 'Fee set.' : action === 'approve' ? 'Extension approved.' : 'Extension rejected.');
      fetchJobs();
    } catch (e: any) { showMsg(e?.response?.data?.error || 'Action failed.', true); }
    setActing(null);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const displayJobs   = filter === 'expired' ? expiredJobs : jobs;
  const deletableJobs = displayJobs.filter(j => isExpired(j) || j.status === 'closed' || j.status === 'rejected');
  const allDelSelected = deletableJobs.length > 0 && deletableJobs.every(j => selected.has(j.id));

  return (
    <AdminLayout>

      <div style={p.pageHeader}>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button className="jp-btn jp-btn-ghost" onClick={handleAutoClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/></svg>
            Auto-Close Expired
          </button>
          {selected.size > 0 && (
            <button
              className="jp-btn jp-btn-danger"
              onClick={handleBulkDelete} disabled={deleting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Delete Selected ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && <Alert type="success" msg={successMsg} onClose={() => setSuccessMsg('')} />}
      {errorMsg   && <Alert type="error"   msg={errorMsg}   onClose={() => setErrorMsg('')}   />}

      {/* ── Filter tabs ── */}
      <div style={p.filterRow}>
        {FILTERS.map(f => (
          <button key={f} className={`jp-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {/* ── Bulk-select bar ── */}
      {deletableJobs.length > 0 && (
        <div style={p.bulkBar}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-sub)' }}>
            <input type="checkbox" checked={allDelSelected}
              onChange={() => {
                setSelected(prev => {
                  const n = new Set(prev);
                  allDelSelected ? deletableJobs.forEach(j => n.delete(j.id)) : deletableJobs.forEach(j => n.add(j.id));
                  return n;
                });
              }} />
            Select all deletable ({deletableJobs.length})
          </label>
          {selected.size > 0 && (
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>{selected.size} selected</span>
          )}
        </div>
      )}

      {/* ── Job list ── */}
      {loading ? (
        <div className="jp-loading">
          <div className="jp-spinner" />
          <p style={{ marginTop: 12, color: 'var(--text-sub)', fontWeight: 500 }}>Loading jobs…</p>
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="jp-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
            {filter === 'expired' ? 'No expired jobs.' : `No ${filterLabel(filter).toLowerCase()} jobs found.`}
          </p>
        </div>
      ) : (
        <div style={p.list}>
          {displayJobs.map(job => {
            const st      = STATUS_CFG[job.status] ?? STATUS_CFG.draft;
            const expired = isExpired(job);
            const isDel   = expired || job.status === 'closed' || job.status === 'rejected';
            const hasExt  = job.extend_status && job.extend_status !== 'none';
            const extSt   = hasExt ? EXTEND_CFG[job.extend_status] : null;
            const isOpen  = expanded === job.id;

            return (
              <div key={job.id} className="jp-card-static" style={{ ...(expired ? p.cardExpired : {}) }}>

                {/* ── Card header ── */}
                <div style={p.cardTop}>
                  {isDel && (
                    <input type="checkbox" checked={selected.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }} />
                  )}
                  <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setExpanded(isOpen ? null : job.id)}>
                    <div style={p.jobTitle}>
                      {job.title}
                      {expired && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #fca5a5' }}>
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <div style={p.meta}>
                      {job.posted_by?.username && <span>By {job.posted_by.username}</span>}
                      {job.location  && <span>· {job.location}</span>}
                      {job.industry  && <span>· {job.industry}</span>}
                      {job.job_type  && <span>· {job.job_type}</span>}
                      <span>· Due {job.deadline || 'N/A'}</span>
                      <span>· {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    {extSt && (
                      <div style={{ marginTop: 6 }}>
                        <Badge bg={extSt.bg} color={extSt.color}>{extSt.label}</Badge>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Badge bg={st.bg} color={st.color}>{st.label}</Badge>
                    {job.posting_fee && (
                      <Badge bg="#dcfce7" color="#16a34a">ETB {job.posting_fee}</Badge>
                    )}
                    <button
                      className="jp-icon-btn"
                      onClick={e => { e.stopPropagation(); handleDelete(job.id); }}
                      disabled={acting === job.id} title="Delete job"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                    <button className="jp-icon-btn" onClick={() => setExpanded(isOpen ? null : job.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        {isOpen ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div style={p.detail}>
                    <div style={p.detailGrid}>
                      <div>
                        <p style={p.detailLabel}>Description</p>
                        <p style={p.detailText}>{job.description || '—'}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          ['Skill Level', job.skill_level],
                          ['Salary',      job.salary || 'Not specified'],
                          ['Deadline',    job.deadline ? `${job.deadline}${expired ? ' ⏰' : ''}` : 'None'],
                          ['Posting Fee', job.posting_fee ? `ETB ${job.posting_fee}` : '—'],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <p style={p.detailLabel}>{k}</p>
                            <p style={{ ...p.detailValue, color: k === 'Deadline' && expired ? '#ef4444' : 'var(--text)' }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {job.admin_note && (
                      <div style={p.noteBox}>
                        <strong>Previous note:</strong> {job.admin_note}
                      </div>
                    )}

                    {/* ── Extension section ── */}
                    {hasExt && (
                      <div style={p.extendBox}>
                        <p style={p.extendTitle}>Deadline Extension Request</p>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
                          <span>Current: <strong style={{ color: 'var(--text)' }}>{job.deadline || 'None'}</strong></span>
                          <span>→ Requested: <strong style={{ color: '#2563eb' }}>{job.extend_new_deadline || 'N/A'}</strong></span>
                          {job.extend_fee && <span>Fee: <strong>ETB {job.extend_fee}</strong></span>}
                        </div>

                        {job.extend_status === 'pending' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <LabeledInput label="Extension Fee (ETB) *"
                              value={extFees[job.id] || ''}
                              onChange={v => setExtFees(f => ({ ...f, [job.id]: v }))}
                              type="number" placeholder={defaultFee || 'e.g. 50'} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <ActionBtn color="success" disabled={acting === job.id} onClick={() => handleExtendAction(job.id, 'set_fee')}>
                                Set Fee & Notify
                              </ActionBtn>
                              <ActionBtn color="danger" disabled={acting === job.id} onClick={() => handleExtendAction(job.id, 'reject')}>
                                Reject Extension
                              </ActionBtn>
                            </div>
                          </div>
                        )}

                        {job.extend_status === 'paid' && (
                          <div style={{ ...p.noteBox, background: '#dcfce7', borderColor: '#86efac', color: '#15803d' }}>
                            Fee paid — deadline extended to <strong>{job.extend_new_deadline}</strong>.
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Approval actions ── */}
                    {['draft', 'under_review', 'approved', 'payment_pending'].includes(job.status) && (
                      <div style={p.actionArea}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <LabeledInput label="Posting Fee (ETB) *"
                            value={fees[job.id] ?? (job.posting_fee || defaultFee)}
                            onChange={v => setFees(f => ({ ...f, [job.id]: v }))}
                            type="number" placeholder={defaultFee ? `Default: ${defaultFee}` : 'e.g. 100'} />
                          <LabeledInput label="Note to employer (optional)"
                            value={notes[job.id] || ''}
                            onChange={v => setNotes(n => ({ ...n, [job.id]: v }))}
                            placeholder="Reason for approval or rejection…" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                          <ActionBtn color="success" disabled={acting === job.id} onClick={() => handleAction(job.id, 'approve')}>
                            Approve & Set Fee
                          </ActionBtn>
                          <ActionBtn color="purple" disabled={acting === job.id} onClick={() => handleAction(job.id, 'publish')}>
                            Publish Directly
                          </ActionBtn>
                          <ActionBtn color="danger" disabled={acting === job.id} onClick={() => handleAction(job.id, 'reject')}>
                            Reject
                          </ActionBtn>
                        </div>
                      </div>
                    )}

                    {job.status === 'published' && !expired && (
                      <div style={{ ...p.noteBox, background: '#dcfce7', borderColor: '#86efac', color: '#15803d' }}>
                        Published {job.published_at ? new Date(job.published_at).toLocaleString() : ''}
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

/* ─── Styles ─────────────────────────────────────────────── */
const p: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    marginBottom: 20, flexWrap: 'wrap', gap: 12,
  },

  filterRow:   { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },

  bulkBar: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'var(--primary-light)',
    borderRadius: 'var(--radius-md)',
    padding: '9px 16px', marginBottom: 12,
    border: '1px solid #d4cfff',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardExpired: {
    border: '1.5px solid #fca5a5',
    background: '#fff8f8',
  },

  cardTop: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 20px',
  },
  jobTitle: {
    fontSize: 15, fontWeight: 700, color: 'var(--text)',
    marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  meta: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
    fontSize: 12, color: 'var(--text-muted)',
  },

  detail: {
    padding: '0 20px 20px',
    borderTop: '1px solid var(--border)',
  },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '2fr 1fr',
    gap: 24, marginTop: 16, marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  detailText:  { fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  detailValue: { fontSize: 14, fontWeight: 600 },

  noteBox: {
    background: '#fef3c7', border: '1px solid #fde68a',
    borderRadius: 'var(--radius-md)', padding: '10px 14px',
    fontSize: 13, color: '#92400e', marginBottom: 12,
  },

  extendBox: {
    background: '#f0f9ff', border: '1px solid #bae6fd',
    borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 14,
  },
  extendTitle: {
    fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 8,
  },

  actionArea: {
    borderTop: '1px solid var(--border)',
    paddingTop: 16,
  },
};
