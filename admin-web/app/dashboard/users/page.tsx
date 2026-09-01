'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetUsers, adminUpdateUser, adminDeleteUser } from '../../../lib/api';

/* ─── config ─────────────────────────────────────────────── */
const ROLE_CFG: Record<string, { bg: string; color: string; border: string }> = {
  jobseeker: { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  employer:  { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  admin:     { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
};

/* ─── small reusable pieces ──────────────────────────────── */
function Alert({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  const ok = type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16,
      fontSize: 13, fontWeight: 500,
      background: ok ? '#dcfce7' : '#fee2e2',
      border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`,
      color: ok ? '#15803d' : '#b91c1c',
    }}>
      <span>{ok ? '✓' : '✕'} {msg}</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.7 }} onClick={onClose}>✕</button>
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, variant = 'blue',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'primary';
}) {
  const map = {
    blue:    { bg: '#dbeafe', color: '#1d4ed8' },
    green:   { bg: '#dcfce7', color: '#15803d' },
    yellow:  { bg: '#fef3c7', color: '#b45309' },
    red:     { bg: '#fee2e2', color: '#b91c1c' },
    gray:    { bg: '#f3f4f6', color: '#374151' },
    primary: { bg: 'var(--primary)', color: '#fff' },
  };
  const c = map[variant];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 'var(--radius-md)', border: 'none',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
        opacity: disabled ? 0.5 : 1,
        background: c.bg, color: c.color,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', phone: '', location: '', role: '', bio: '' });

  const fetchUsers = async () => {
    setLoading(true);
    const params = filter !== 'all' ? { role: filter } : {};
    const res = await adminGetUsers(params);
    setUsers(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [filter]);

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 3500); return () => clearTimeout(t); }
  }, [successMsg]);

  const notify = (msg: string) => setSuccessMsg(msg);
  const fail   = (msg: string) => setErrorMsg(msg);

  const act = async (id: number, fn: () => Promise<any>, msg: string) => {
    setActing(id);
    try { await fn(); notify(msg); fetchUsers(); }
    catch (e: any) { fail(e?.response?.data?.detail || 'Action failed.'); }
    finally { setActing(null); }
  };

  const handleActivate   = (u: any) => act(u.id, () => adminUpdateUser(u.id, { is_suspended: false, is_active: true }),  `${u.username} activated.`);
  const handleDeactivate = (u: any) => {
    if (!confirm(`Deactivate ${u.username}? They won't be able to log in.`)) return;
    act(u.id, () => adminUpdateUser(u.id, { is_suspended: true, is_active: false }), `${u.username} deactivated.`);
  };
  const handleDelete = (u: any) => {
    if (!confirm(`Permanently delete ${u.username}? This cannot be undone.`)) return;
    act(u.id, () => adminDeleteUser(u.id), `${u.username} deleted.`);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditForm({ username: u.username || '', email: u.email || '', phone: u.phone || '', location: u.location || '', role: u.role || '', bio: u.bio || '' });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setActing(editUser.id);
    try {
      await adminUpdateUser(editUser.id, editForm);
      notify(`${editUser.username} updated.`);
      setEditUser(null);
      fetchUsers();
    } catch (e: any) { fail(e?.response?.data?.detail || 'Update failed.'); }
    setActing(null);
  };

  const isActive = (u: any) => !u.is_suspended && u.is_active !== false;

  const filtered = users.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.location?.toLowerCase().includes(search.toLowerCase())
  );

  /* role counts */
  const counts = {
    all:       users.length,
    jobseeker: users.filter(u => u.role === 'jobseeker').length,
    employer:  users.filter(u => u.role === 'employer').length,
    admin:     users.filter(u => u.role === 'admin').length,
  };

  return (
    <AdminLayout>

      {/* ── Page header ── */}
      <div style={p.pageHeader}>
        <div>
          <h1 style={p.pageTitle}>User Management</h1>
          <p style={p.pageSub}>Manage user accounts, roles and permissions</p>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && <Alert type="success" msg={successMsg} onClose={() => setSuccessMsg('')} />}
      {errorMsg   && <Alert type="error"   msg={errorMsg}   onClose={() => setErrorMsg('')}   />}

      {/* ── Search + filter bar ── */}
      <div style={p.toolBar}>
        {/* Search */}
        <div style={p.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={p.searchInput}
            placeholder="Search by name, email or location…"
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

        {/* Role filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'jobseeker', 'employer', 'admin'] as const).map(f => (
            <button key={f}
              style={{ ...p.filterBtn, ...(filter === f ? p.filterActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, opacity: 0.75 }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <span style={p.totalBadge}>
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={p.tableCard}>
        {loading ? (
          <div style={p.loadingBox}>
            <div style={p.spinner} />
            <p style={{ marginTop: 12, color: 'var(--text-sub)', fontWeight: 500 }}>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={p.emptyBox}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
              {search ? `No users found for "${search}"` : 'No users found.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={p.table}>
              <thead>
                <tr>
                  <th style={p.th}>User</th>
                  <th style={p.th}>Email</th>
                  <th style={p.th}>Role</th>
                  <th style={p.th}>Phone</th>
                  <th style={p.th}>Location</th>
                  <th style={p.th}>Status</th>
                  <th style={{ ...p.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rc     = ROLE_CFG[u.role] ?? ROLE_CFG.jobseeker;
                  const active = isActive(u);
                  const busy   = acting === u.id;

                  return (
                    <tr key={u.id} style={p.tr}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      {/* User cell */}
                      <td style={p.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={p.avatar}>{u.username?.[0]?.toUpperCase() ?? '?'}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.username}</div>
                            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>ID #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={p.td}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{u.email}</span>
                      </td>

                      {/* Role badge */}
                      <td style={p.td}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 800, background: rc.bg, color: rc.color, border: `1.5px solid ${rc.border}` }}>
                          {u.role}
                        </span>
                      </td>

                      {/* Phone */}
                      <td style={p.td}>
                        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{u.phone || '—'}</span>
                      </td>

                      {/* Location */}
                      <td style={p.td}>
                        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{u.location || '—'}</span>
                      </td>

                      {/* Status */}
                      <td style={p.td}>
                        {active
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                              Active
                            </span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                              Inactive
                            </span>
                        }
                      </td>

                      {/* Actions */}
                      <td style={{ ...p.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 5 }}>
                          <ActionBtn variant="blue"   disabled={busy} onClick={() => openEdit(u)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </ActionBtn>
                          {active
                            ? <ActionBtn variant="yellow" disabled={busy} onClick={() => handleDeactivate(u)}>
                                {busy ? '…' : 'Deactivate'}
                              </ActionBtn>
                            : <ActionBtn variant="green"  disabled={busy} onClick={() => handleActivate(u)}>
                                {busy ? '…' : 'Activate'}
                              </ActionBtn>
                          }
                          <ActionBtn variant="red" disabled={busy} onClick={() => handleDelete(u)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                            {busy ? '…' : 'Delete'}
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editUser && (
        <>
          <div style={m.overlay} onClick={() => setEditUser(null)} />
          <div style={m.modal}>

            {/* Header */}
            <div style={m.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={m.modalAvatar}>{editUser.username?.[0]?.toUpperCase()}</div>
                <div>
                  <h3 style={m.title}>Edit User</h3>
                  <p style={m.sub}>@{editUser.username} · {editUser.email}</p>
                </div>
              </div>
              <button style={m.closeBtn} onClick={() => setEditUser(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={m.body}>
              {([
                { label: 'Username',  key: 'username',  type: 'text',  placeholder: 'e.g. john_doe' },
                { label: 'Email',     key: 'email',     type: 'email', placeholder: 'e.g. user@example.com' },
                { label: 'Phone',     key: 'phone',     type: 'text',  placeholder: 'e.g. +251911234567' },
                { label: 'Location',  key: 'location',  type: 'text',  placeholder: 'e.g. Addis Ababa' },
                { label: 'Bio',       key: 'bio',       type: 'text',  placeholder: 'Short bio…' },
              ] as const).map(f => (
                <div key={f.key} style={m.field}>
                  <label style={m.label}>{f.label}</label>
                  <input
                    style={m.input}
                    type={f.type}
                    value={(editForm as any)[f.key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}

              <div style={m.field}>
                <label style={m.label}>Role</label>
                <select
                  style={m.input}
                  value={editForm.role}
                  onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="jobseeker">Job Seeker</option>
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div style={m.footer}>
              <button style={m.cancelBtn} onClick={() => setEditUser(null)}>Cancel</button>
              <button
                style={{ ...m.saveBtn, opacity: acting === editUser.id ? 0.7 : 1 }}
                disabled={acting === editUser.id}
                onClick={handleEditSave}
              >
                {acting === editUser.id ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

          </div>
        </>
      )}
    </AdminLayout>
  );
}

/* ─── Page styles ────────────────────────────────────────── */
const p: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  pageSub:    { fontSize: 14, color: 'var(--text-sub)' },

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
    display: 'inline-flex', alignItems: 'center',
    padding: '7px 14px', borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
  },
  filterActive: {
    background: 'var(--primary)', color: '#fff',
    border: '1.5px solid var(--primary)',
  },

  totalBadge: {
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

  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
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
  td: { padding: '12px 16px', fontSize: 13, verticalAlign: 'middle' },

  avatar: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 14,
    boxShadow: '0 2px 6px rgba(108,99,255,0.3)',
  },
};

/* ─── Modal styles ───────────────────────────────────────── */
const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    width: '100%', maxWidth: 460,
    zIndex: 101,
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
  },
  modalAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 16, flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  sub:   { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center',
  },

  body: {
    padding: '18px 24px',
    display: 'flex', flexDirection: 'column', gap: 12,
    maxHeight: '55vh', overflowY: 'auto',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' },
  input: {
    padding: '10px 13px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)',
    fontSize: 14, color: 'var(--text)',
    background: 'var(--bg)', outline: 'none',
  },

  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 24px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  cancelBtn: {
    padding: '9px 20px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 24px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--primary)',
    fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
  },
};
