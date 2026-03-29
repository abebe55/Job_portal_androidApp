'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetEmployerVerifications, adminReviewEmployerVerification } from '../../../lib/api';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

const STATUS_STYLE: any = {
  pending:  { bg: '#fef3c7', color: '#b45309', label: 'Pending Review' },
  approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
};

const TYPE_LABELS: any = {
  company:    'Company / PLC',
  factory:    'Factory / Manufacturing',
  ngo:        'NGO / Organization',
  shop:       'Shop / Small Business',
  individual: 'Individual / Freelancer',
  other:      'Other',
};

function DocLink({ label, url }: { label: string; url: string }) {
  if (!url) return null;
  const full = url.startsWith('http') ? url : `${BASE}${url}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
  return (
    <div style={s.docRow}>
      <span style={s.docLabel}>{label}</span>
      <a href={full} target="_blank" rel="noreferrer" style={s.docLink}>
        {isImage ? '🖼 View Image' : '📄 View File'}
      </a>
    </div>
  );
}

export default function EmployerApprovalsPage() {
  const [verifs, setVerifs]   = useState<any[]>([]);
  const [filter, setFilter]   = useState('pending');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes]     = useState<Record<number, string>>({});
  const [acting, setActing]   = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const fetchVerifs = async () => {
    setLoading(true);
    const params = filter !== 'all' ? { status: filter } : {};
    const res = await adminGetEmployerVerifications(params);
    setVerifs(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchVerifs(); }, [filter]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3500); return () => clearTimeout(t); }
  }, [success]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      await adminReviewEmployerVerification(id, { action, note: notes[id] || '' });
      setSuccess(`Employer ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setExpanded(null);
      fetchVerifs();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Action failed.');
    }
    setActing(null);
  };

  const counts = {
    pending:  verifs.filter(v => v.status === 'pending').length,
    approved: verifs.filter(v => v.status === 'approved').length,
    rejected: verifs.filter(v => v.status === 'rejected').length,
  };

  return (
    <AdminLayout>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Employer Approvals</h1>
        <p style={s.pageSub}>Review employer registration credentials and approve or reject accounts</p>
      </div>

      {/* Summary cards */}
      <div style={s.summaryRow}>
        {[
          { label: 'Pending Review', count: counts.pending,  color: '#b45309', bg: '#fef3c7' },
          { label: 'Approved',       count: counts.approved, color: '#15803d', bg: '#dcfce7' },
          { label: 'Rejected',       count: counts.rejected, color: '#b91c1c', bg: '#fee2e2' },
        ].map(c => (
          <div key={c.label} style={s.summaryCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.count}</div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {success && (
        <div style={s.alertSuccess}>
          <span>✓ {success}</span>
          <button style={s.alertClose} onClick={() => setSuccess('')}>✕</button>
        </div>
      )}
      {error && (
        <div style={s.alertError}>
          <span>✕ {error}</span>
          <button style={s.alertClose} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={s.filterRow}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f}
            style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && counts.pending > 0 && (
              <span style={s.badge}>{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={s.loadingBox}><div style={s.spinner} /><p style={{ marginTop: 12, color: '#374151' }}>Loading...</p></div>
      ) : verifs.length === 0 ? (
        <div style={s.emptyBox}>
          <span style={{ fontSize: 40 }}>🏢</span>
          <p style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>No {filter} employer applications.</p>
        </div>
      ) : (
        <div style={s.list}>
          {verifs.map(v => {
            const st = STATUS_STYLE[v.status] || STATUS_STYLE.pending;
            const isOpen = expanded === v.id;
            const busy = acting === v.id;
            return (
              <div key={v.id} style={s.card}>
                {/* Header row */}
                <div style={s.cardTop} onClick={() => setExpanded(isOpen ? null : v.id)}>
                  <div style={s.empAvatar}>{v.username?.[0]?.toUpperCase() ?? 'E'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.empName}>{v.username}</div>
                    <div style={s.empMeta}>
                      <span>{v.email}</span>
                      {v.phone && <span>· {v.phone}</span>}
                      {v.location && <span>· {v.location}</span>}
                    </div>
                    <div style={s.empType}>
                      <span style={s.typeTag}>{TYPE_LABELS[v.employer_type] || v.employer_type}</span>
                      {v.organization_name && <span style={s.orgName}>{v.organization_name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 16, color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={s.detail}>
                    <div style={s.detailGrid}>
                      {/* Left: employer info */}
                      <div>
                        <div style={s.sectionLabel}>Employer Information</div>
                        <div style={s.infoRow}><span style={s.infoKey}>Type</span><span>{TYPE_LABELS[v.employer_type] || v.employer_type}</span></div>
                        {v.employer_type_other && <div style={s.infoRow}><span style={s.infoKey}>Specified As</span><span>{v.employer_type_other}</span></div>}
                        {v.organization_name && <div style={s.infoRow}><span style={s.infoKey}>Organization</span><span>{v.organization_name}</span></div>}
                        {v.national_id_number && <div style={s.infoRow}><span style={s.infoKey}>National ID No.</span><span style={{ fontWeight: 700 }}>{v.national_id_number}</span></div>}
                        <div style={s.infoRow}><span style={s.infoKey}>Submitted</span><span>{new Date(v.submitted_at).toLocaleString()}</span></div>
                        {v.reviewed_at && <div style={s.infoRow}><span style={s.infoKey}>Reviewed</span><span>{new Date(v.reviewed_at).toLocaleString()}</span></div>}
                        {v.admin_note && (
                          <div style={s.noteBox}><strong>Admin note:</strong> {v.admin_note}</div>
                        )}
                      </div>

                      {/* Right: documents */}
                      <div>
                        <div style={s.sectionLabel}>Uploaded Documents</div>
                        <DocLink label="Business License"         url={v.business_license} />
                        <DocLink label="TIN Certificate"          url={v.tin_certificate} />
                        <DocLink label="Registration Certificate" url={v.registration_cert} />
                        <DocLink label="National ID — Front"      url={v.national_id_front} />
                        <DocLink label="National ID — Back"       url={v.national_id_back} />
                        <DocLink label="Supporting Document"      url={v.supporting_doc} />
                        {!v.business_license && !v.tin_certificate && !v.registration_cert &&
                         !v.national_id_front && !v.national_id_back && !v.supporting_doc && (
                          <p style={{ color: '#9ca3af', fontSize: 13 }}>No documents uploaded.</p>
                        )}
                      </div>
                    </div>

                    {/* Action area — only for pending */}
                    {v.status === 'pending' && (
                      <div style={s.actionArea}>
                        <div style={s.noteRow}>
                          <label style={s.noteLabel}>Note to employer (optional)</label>
                          <input style={s.noteInput}
                            placeholder="Reason for approval or rejection..."
                            value={notes[v.id] || ''}
                            onChange={e => setNotes(n => ({ ...n, [v.id]: e.target.value }))} />
                        </div>
                        <div style={s.btnRow}>
                          <button style={{ ...s.approveBtn, opacity: busy ? 0.6 : 1 }}
                            disabled={busy} onClick={() => handleAction(v.id, 'approve')}>
                            {busy ? '…' : '✓ Approve Employer'}
                          </button>
                          <button style={{ ...s.rejectBtn, opacity: busy ? 0.6 : 1 }}
                            disabled={busy} onClick={() => handleAction(v.id, 'reject')}>
                            {busy ? '…' : '✕ Reject'}
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

const s: Record<string, React.CSSProperties> = {
  pageHeader:   { marginBottom: 20 },
  pageTitle:    { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 },
  pageSub:      { fontSize: 14, color: '#6b7280' },

  summaryRow:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 },
  summaryCard:  {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 4px 20px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    border: '1px solid rgba(255,255,255,0.9)',
  },

  alertSuccess: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#15803d', fontWeight: 600, fontSize: 14 },
  alertError:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#b91c1c', fontWeight: 600, fontSize: 14 },
  alertClose:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.7 },

  filterRow:    { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const },
  filterBtn:    { padding: '7px 16px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  filterActive: { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' },
  badge:        { background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '1px 7px' },

  loadingBox:   { padding: 48, textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  spinner:      { width: 40, height: 40, border: '3px solid #e0e7ff', borderTop: '3px solid #7c3aed', borderRadius: '50%' },
  emptyBox:     { padding: 48, textAlign: 'center' as const, color: '#6b7280' },

  list:         { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  card:         { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' },
  cardTop:      { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' },
  empAvatar:    { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  empName:      { fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 2 },
  empMeta:      { fontSize: 12, color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 },
  empType:      { display: 'flex', alignItems: 'center', gap: 8 },
  typeTag:      { fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 20 },
  orgName:      { fontSize: 12, color: '#374151', fontWeight: 600 },
  statusBadge:  { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 },

  detail:       { padding: '0 20px 20px', borderTop: '1px solid #f0f0f0' },
  detailGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 },
  infoRow:      { display: 'flex', gap: 10, marginBottom: 6, fontSize: 13 },
  infoKey:      { fontWeight: 700, color: '#374151', minWidth: 120 },
  noteBox:      { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#92400e', marginTop: 8 },

  docRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0' },
  docLabel:     { fontSize: 13, color: '#374151', fontWeight: 600 },
  docLink:      { fontSize: 12, color: '#2563eb', fontWeight: 700, textDecoration: 'none' },

  actionArea:   { borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', flexDirection: 'column' as const, gap: 10 },
  noteRow:      { display: 'flex', alignItems: 'center', gap: 12 },
  noteLabel:    { fontSize: 13, fontWeight: 600, color: '#6b7280', minWidth: 200 },
  noteInput:    { flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, background: '#f9fafb' },
  btnRow:       { display: 'flex', gap: 10 },
  approveBtn:   { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
  rejectBtn:    { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
};
