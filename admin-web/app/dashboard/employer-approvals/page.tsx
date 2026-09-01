'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetEmployerVerifications, adminReviewEmployerVerification } from '../../../lib/api';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

/* ─── config ─────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef3c7', color: '#b45309', label: 'Pending Review' },
  approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
};

const TYPE_LABELS: Record<string, string> = {
  company:    'Company / PLC',
  factory:    'Factory / Manufacturing',
  ngo:        'NGO / Organization',
  shop:       'Shop / Small Business',
  individual: 'Individual / Freelancer',
  other:      'Other',
};

/* ─── small reusable pieces ──────────────────────────────── */
function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' as const }}>
      {children}
    </span>
  );
}

function Alert({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  const ok = type === 'success';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 500, background: ok ? '#dcfce7' : '#fee2e2', border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`, color: ok ? '#15803d' : '#b91c1c' }}>
      <span>{ok ? '✓' : '✕'} {msg}</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.7 }} onClick={onClose}>✕</button>
    </div>
  );
}

/* ─── Image preview modal ─────────────────────────────────── */
function ImageModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{label}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 18, lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>
        <img src={url} alt={label} style={{ maxWidth: '85vw', maxHeight: '78vh', objectFit: 'contain', display: 'block' }} />
      </div>
    </div>
  );
}

/* ─── Document link row ───────────────────────────────────── */
function DocLink({ label, url }: { label: string; url: string }) {
  const [preview, setPreview] = useState(false);
  if (!url) return null;
  const full    = url.startsWith('http') ? url : `${BASE}${url}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        {isImage ? (
          <button
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer' }}
            onClick={() => setPreview(true)}
          >
            View Image
          </button>
        ) : (
          <a href={full} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', background: '#eff6ff', borderRadius: 'var(--radius-sm)', padding: '3px 10px' }}>
            View File
          </a>
        )}
      </div>
      {preview && <ImageModal url={full} label={label} onClose={() => setPreview(false)} />}
    </>
  );
}

/* ─── Summary stat card ───────────────────────────────────── */
function SumCard({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-sub)' }}>{label}</div>
      <div style={{ height: 3, borderRadius: 2, background: bg, marginTop: 4 }} />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function EmployerApprovalsPage() {
  const [verifs, setVerifs]       = useState<any[]>([]);
  const [allVerifs, setAllVerifs] = useState<any[]>([]);
  const [filter, setFilter]       = useState('pending');
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [notes, setNotes]         = useState<Record<number, string>>({});
  const [acting, setActing]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const fetchVerifs = async () => {
    setLoading(true);
    try {
      const params  = filter !== 'all' ? { status: filter } : {};
      const [res, allRes] = await Promise.all([
        adminGetEmployerVerifications(params),
        adminGetEmployerVerifications({}),
      ]);
      setVerifs(res.data.map((v: any) => ({ ...v, id: v.user_id })));
      setAllVerifs(allRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchVerifs(); }, [filter]);

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 3500); return () => clearTimeout(t); }
  }, [successMsg]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActing(`${id}-${action}`);
    setErrorMsg('');
    try {
      await adminReviewEmployerVerification(id, { action, note: notes[id] || '' });
      setSuccessMsg(`Employer ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setExpanded(null);
      fetchVerifs();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || 'Action failed.');
    }
    setActing(null);
  };

  const counts = {
    pending:  allVerifs.filter(v => v.status === 'pending').length,
    approved: allVerifs.filter(v => v.status === 'approved').length,
    rejected: allVerifs.filter(v => v.status === 'rejected').length,
  };

  return (
    <AdminLayout>

      {/* ── Page header ── */}
      <div style={p.pageHeader}>
        <div>
          <h1 style={p.pageTitle}>Employer Approvals</h1>
          <p style={p.pageSub}>Review employer registration credentials and approve or reject accounts</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={p.sumGrid}>
        <SumCard count={counts.pending}  label="Pending Review" color="#b45309" bg="#fde68a" />
        <SumCard count={counts.approved} label="Approved"       color="#15803d" bg="#86efac" />
        <SumCard count={counts.rejected} label="Rejected"       color="#b91c1c" bg="#fca5a5" />
      </div>

      {/* ── Alerts ── */}
      {successMsg && <Alert type="success" msg={successMsg} onClose={() => setSuccessMsg('')} />}
      {errorMsg   && <Alert type="error"   msg={errorMsg}   onClose={() => setErrorMsg('')}   />}

      {/* ── Filter tabs ── */}
      <div style={p.filterRow}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f}
            style={{ ...p.filterBtn, ...(filter === f ? p.filterActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && counts.pending > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 800, padding: '1px 6px', marginLeft: 4 }}>
                {counts.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div style={p.loadingBox}>
          <div style={p.spinner} />
          <p style={{ marginTop: 12, color: 'var(--text-sub)', fontWeight: 500 }}>Loading employers…</p>
        </div>
      ) : verifs.length === 0 ? (
        <div style={p.emptyBox}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
            No {filter === 'all' ? '' : filter} employer applications.
          </p>
        </div>
      ) : (
        <div style={p.list}>
          {verifs.map(v => {
            const st     = STATUS_CFG[v.status] ?? STATUS_CFG.pending;
            const isOpen = expanded === v.id;
            return (
              <div key={v.id} style={p.card}>

                {/* ── Card header row ── */}
                <div style={p.cardTop} onClick={() => setExpanded(isOpen ? null : v.id)}>
                  <div style={p.avatar}>{v.username?.[0]?.toUpperCase() ?? 'E'}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={p.empName}>{v.username}</div>
                    <div style={p.empMeta}>
                      {v.email && <span>{v.email}</span>}
                      {v.phone && <span>· {v.phone}</span>}
                      {v.location && <span>· {v.location}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Badge bg="#fef3c7" color="#b45309">
                        {TYPE_LABELS[v.employer_type] ?? v.employer_type}
                      </Badge>
                      {v.organization_name && (
                        <span style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 500 }}>{v.organization_name}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <Badge bg={st.bg} color={st.color}>{st.label}</Badge>
                    <button style={p.chevronBtn}>
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

                      {/* Left: employer info */}
                      <div>
                        <p style={p.sectionLabel}>Employer Information</p>
                        {[
                          ['Type',          TYPE_LABELS[v.employer_type] ?? v.employer_type],
                          v.employer_type_other && ['Specified As', v.employer_type_other],
                          v.organization_name   && ['Organization', v.organization_name],
                          v.national_id_number  && ['National ID No.', v.national_id_number],
                          ['Submitted', new Date(v.submitted_at).toLocaleString()],
                          v.reviewed_at && ['Reviewed', new Date(v.reviewed_at).toLocaleString()],
                        ].filter(Boolean).map(([k, val]) => (
                          <div key={k as string} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-sub)', minWidth: 130 }}>{k as string}</span>
                            <span style={{ color: 'var(--text)', fontWeight: k === 'National ID No.' ? 700 : 400 }}>{val as string}</span>
                          </div>
                        ))}
                        {v.admin_note && (
                          <div style={p.noteBox}>
                            <strong>Admin note:</strong> {v.admin_note}
                          </div>
                        )}
                      </div>

                      {/* Right: documents */}
                      <div>
                        <p style={p.sectionLabel}>Uploaded Documents</p>
                        <DocLink label="Business License"         url={v.business_license} />
                        <DocLink label="TIN Certificate"          url={v.tin_certificate} />
                        <DocLink label="Registration Certificate" url={v.registration_cert} />
                        <DocLink label="National ID — Front"      url={v.national_id_front} />
                        <DocLink label="National ID — Back"       url={v.national_id_back} />
                        <DocLink label="Supporting Document"      url={v.supporting_doc} />
                        {!v.business_license && !v.tin_certificate && !v.registration_cert &&
                         !v.national_id_front && !v.national_id_back && !v.supporting_doc && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>No documents uploaded.</p>
                        )}
                      </div>
                    </div>

                    {/* ── Action area (pending only) ── */}
                    {v.status === 'pending' && (
                      <div style={p.actionArea}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', minWidth: 200, flexShrink: 0 }}>
                            Note to employer (optional)
                          </label>
                          <input
                            style={p.noteInput}
                            placeholder="Reason for approval or rejection…"
                            value={notes[v.id] || ''}
                            onChange={e => setNotes(n => ({ ...n, [v.id]: e.target.value }))}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            style={{ ...p.approveBtn, opacity: acting === `${v.id}-approve` ? 0.7 : 1 }}
                            disabled={!!acting}
                            onClick={() => handleAction(v.id, 'approve')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {acting === `${v.id}-approve` ? 'Approving…' : 'Approve Employer'}
                          </button>
                          <button
                            style={{ ...p.rejectBtn, opacity: acting === `${v.id}-reject` ? 0.7 : 1 }}
                            disabled={!!acting}
                            onClick={() => handleAction(v.id, 'reject')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            {acting === `${v.id}-reject` ? 'Rejecting…' : 'Reject'}
                          </button>
                        </div>
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
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  pageSub:    { fontSize: 14, color: 'var(--text-sub)' },

  sumGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16, marginBottom: 24,
  },

  filterRow:   { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  filterBtn:   {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '7px 14px', borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
  },
  filterActive: { background: 'var(--primary)', color: '#fff', border: '1.5px solid var(--primary)' },

  loadingBox: { padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  spinner:    { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%' },
  emptyBox:   { padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },

  cardTop: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 20px', cursor: 'pointer',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 18,
  },
  empName: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 },
  empMeta: { display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' },

  chevronBtn: {
    width: 28, height: 28, borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },

  detail: { padding: '0 20px 20px', borderTop: '1px solid var(--border)' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 18, marginBottom: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
  },

  noteBox: {
    background: '#fef3c7', border: '1px solid #fde68a',
    borderRadius: 'var(--radius-md)', padding: '9px 13px',
    fontSize: 13, color: '#92400e', marginTop: 10,
  },

  actionArea: {
    borderTop: '1px solid var(--border)', paddingTop: 16,
  },
  noteInput: {
    flex: 1, padding: '9px 12px',
    borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)',
    fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none',
  },

  approveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
    background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  rejectBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
    background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
};
