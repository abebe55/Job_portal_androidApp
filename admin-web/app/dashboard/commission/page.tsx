'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetCommission, adminUpdateCommission } from '../../../lib/api';

export default function CommissionPage() {
  const [fee, setFee]         = useState('');
  const [current, setCurrent] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    adminGetCommission().then(res => setCurrent(res.data));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await adminUpdateCommission({ job_post_fee: fee });
      setCurrent(res.data);
      setFee('');
      setMsg({ text: 'Commission fee updated successfully.', ok: true });
    } catch {
      setMsg({ text: 'Failed to update. Make sure you are an admin.', ok: false });
    }
    setSaving(false);
  };

  return (
    <AdminLayout>

      {/* ── Page header ── */}
      <div style={p.pageHeader}>
        <h1 style={p.pageTitle}>Commission Settings</h1>
        <p style={p.pageSub}>Configure the fee charged to employers when they post a job</p>
      </div>

      <div style={p.layout}>

        {/* ── Main settings card ── */}
        <div style={p.card}>

          {/* Current fee display */}
          {current && (
            <div style={p.currentBox}>
              <div style={p.currentLeft}>
                <div style={p.currentIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div>
                  <p style={p.currentLabel}>Current Job Post Fee</p>
                  <p style={p.currentValue}>ETB {current.job_post_fee}</p>
                </div>
              </div>
              {current.updated_by && (
                <span style={p.updatedBy}>Last updated by <strong>{current.updated_by}</strong></span>
              )}
            </div>
          )}

          <div style={p.divider} />

          {/* Description */}
          <p style={p.desc}>
            This fee is deducted from an employer's wallet balance each time they post a job.
            If their balance falls below this amount, they will be prompted to top up via Chapa
            before the job can be submitted for review.
          </p>

          {/* Update form */}
          <form onSubmit={handleSave} style={p.form}>
            <div style={p.fieldGroup}>
              <label style={p.label}>New Job Post Fee (ETB)</label>
              <div style={p.inputRow}>
                <div style={p.inputWrap}>
                  <span style={p.inputPrefix}>ETB</span>
                  <input
                    style={p.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={current ? `Current: ${current.job_post_fee}` : 'e.g. 100.00'}
                    value={fee}
                    onChange={e => setFee(e.target.value)}
                    required
                  />
                </div>
                <button style={{ ...p.saveBtn, opacity: saving ? 0.7 : 1 }} type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Save Fee
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inline feedback */}
            {msg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                fontSize: 13, fontWeight: 500,
                background: msg.ok ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${msg.ok ? '#86efac' : '#fca5a5'}`,
                color: msg.ok ? '#15803d' : '#b91c1c',
              }}>
                {msg.ok
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                }
                {msg.text}
              </div>
            )}
          </form>

          <div style={p.divider} />

          {/* Note */}
          <div style={p.noteBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6, margin: 0 }}>
              <strong>Important:</strong> Employers must maintain sufficient wallet balance to post a job.
              Changes take effect immediately for all new job postings.
            </p>
          </div>
        </div>

        {/* ── Info side panel ── */}
        <div style={p.infoPanel}>
          <p style={p.infoPanelTitle}>How it works</p>

          {[
            {
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
              title: 'Employer Posts a Job',
              text: 'When an employer submits a new job, their wallet is checked for sufficient balance.',
            },
            {
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
              title: 'Fee is Deducted',
              text: 'The commission fee is automatically deducted from their wallet balance.',
            },
            {
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
              title: 'Job Goes for Review',
              text: 'Once payment is confirmed, the job is submitted to the admin approval queue.',
            },
            {
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              title: 'Revenue is Tracked',
              text: 'All commission payments are recorded in the Transactions page for full visibility.',
            },
          ].map((item, i) => (
            <div key={i} style={p.infoStep}>
              <div style={p.infoStepIcon}>{item.icon}</div>
              <div>
                <p style={p.infoStepTitle}>{item.title}</p>
                <p style={p.infoStepText}>{item.text}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const p: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 28 },
  pageTitle:  { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  pageSub:    { fontSize: 14, color: 'var(--text-sub)' },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 20,
    alignItems: 'start',
  },

  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-card)',
    padding: '24px 28px',
    display: 'flex', flexDirection: 'column', gap: 20,
  },

  currentBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
    background: 'var(--primary-light)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    border: '1px solid #d4cfff',
  },
  currentLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  currentIcon: {
    width: 44, height: 44, borderRadius: 'var(--radius-md)',
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)', flexShrink: 0,
  },
  currentLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 },
  currentValue: { fontSize: 26, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 },
  updatedBy:    { fontSize: 12, color: 'var(--text-sub)' },

  divider: { height: 1, background: 'var(--border)', margin: '0 -4px' },

  desc: {
    fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7,
  },

  form:        { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 8 },
  label:       { fontSize: 13, fontWeight: 700, color: 'var(--text-sub)' },

  inputRow: { display: 'flex', gap: 10 },
  inputWrap: {
    flex: 1, position: 'relative',
    display: 'flex', alignItems: 'center',
  },
  inputPrefix: {
    position: 'absolute', left: 12,
    fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    flex: 1, width: '100%',
    paddingTop: 12, paddingBottom: 12,
    paddingLeft: 46, paddingRight: 14,
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)',
    fontSize: 16, fontWeight: 600,
    color: 'var(--text)', background: 'var(--bg)', outline: 'none',
  },
  saveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '12px 22px',
    borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--primary)',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  noteBox: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: '#fef3c7', border: '1px solid #fde68a',
    borderRadius: 'var(--radius-md)', padding: '12px 16px',
  },

  /* Info panel */
  infoPanel: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-card)',
    padding: '20px 22px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  infoPanelTitle: {
    fontSize: 13, fontWeight: 800, color: 'var(--text)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: 4,
  },

  infoStep: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  infoStepIcon: {
    width: 32, height: 32, borderRadius: 'var(--radius-md)',
    background: 'var(--bg)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoStepTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 },
  infoStepText:  { fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 },
};
