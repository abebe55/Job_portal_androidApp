'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetCommission, adminUpdateCommission } from '../../../lib/api';

export default function CommissionPage() {
  const [fee, setFee] = useState('');
  const [current, setCurrent] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminGetCommission().then(res => {
      setCurrent(res.data);
      setFee(res.data.job_post_fee);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const res = await adminUpdateCommission({ job_post_fee: fee });
      setCurrent(res.data);
      setMsg('Commission fee updated successfully!');
    } catch {
      setMsg('Failed to update. Make sure you are an admin.');
    }
    setSaving(false);
  };

  return (
    <AdminLayout>
      <h2 style={styles.pageTitle}>Commission Settings</h2>
      <div style={styles.card}>
        <p style={styles.desc}>
          This is the fee charged to employers each time they post a job.
          The fee is deducted from their wallet balance before the job is submitted for approval.
        </p>

        {current && (
          <div style={styles.currentBox}>
            <span style={styles.currentLabel}>Current Fee</span>
            <span style={styles.currentValue}>ETB {current.job_post_fee}</span>
            {current.updated_by && <span style={styles.updatedBy}>Last updated by: {current.updated_by}</span>}
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.label}>New Job Post Fee (ETB)</label>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={e => setFee(e.target.value)}
              required
            />
            <button style={styles.btn} type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {msg && <p style={{ marginTop: 12, fontSize: 14, color: msg.startsWith('Commission') ? '#16a34a' : '#ef4444' }}>{msg}</p>}
        </form>

        <div style={styles.note}>
          <strong>Note:</strong> Employers must have sufficient wallet balance to post a job.
          If their balance is below this fee, they will be prompted to top up via Chapa.
        </div>
      </div>
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--text)' },
  card: { background: '#fff', borderRadius: 14, padding: 28, maxWidth: 520, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  desc: { fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 20 },
  currentBox: {
    background: 'var(--primary-light)', borderRadius: 10, padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap',
  },
  currentLabel: { fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 },
  currentValue: { fontSize: 28, fontWeight: 800, color: 'var(--primary)' },
  updatedBy: { fontSize: 12, color: 'var(--text-sub)', marginLeft: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' },
  inputRow: { display: 'flex', gap: 10 },
  input: {
    flex: 1, padding: '12px 14px', borderRadius: 10,
    border: '1px solid var(--border)', fontSize: 16, background: 'var(--bg)',
  },
  btn: {
    padding: '12px 24px', borderRadius: 10, border: 'none',
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14,
  },
  note: {
    marginTop: 20, padding: '12px 16px', background: '#fef3c7',
    borderRadius: 10, fontSize: 13, color: '#92400e', lineHeight: 1.5,
  },
};
