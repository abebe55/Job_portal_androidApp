'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { adminGetUsers, adminUpdateUser, adminDeleteUser } from '../../../lib/api';

const ROLE_COLORS: any = {
  jobseeker: { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  employer:  { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  admin:     { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
};

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<number | null>(null);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
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
    if (success) { const t = setTimeout(() => setSuccess(''), 3500); return () => clearTimeout(t); }
  }, [success]);

  const notify = (msg: string) => setSuccess(msg);
  const fail   = (msg: string) => setError(msg);

  const act = async (id: number, fn: () => Promise<void>, msg: string) => {
    setActing(id);
    try { await fn(); notify(msg); fetchUsers(); }
    catch (e: any) { fail(e?.response?.data?.detail || 'Action failed.'); }
    finally { setActing(null); }
  };

  const handleActivate = (u: any) =>
    act(u.id, () => adminUpdateUser(u.id, { is_suspended: false, is_active: true }), `${u.username} activated.`);

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
    } catch (e: any) {
      fail(e?.response?.data?.detail || 'Update failed.');
    }
    setActing(null);
  };

  const filtered = users.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.location?.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = (u: any) => !u.is_suspended && u.is_active !== false;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>User Management</h1>
        <p style={s.pageSub}>Manage user accounts, roles and permissions</p>
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

      {/* Search + filter bar */}
      <div style={s.searchBar}>
        <div style={s.searchInputWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput}
            placeholder="Search by username, email or location..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div style={s.filterRow}>
          {['all', 'jobseeker', 'employer', 'admin'].map(f => (
            <button key={f}
              style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.totalBadge}>
          Total: <strong style={{ color: '#7c3aed' }}>{filtered.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.loadingBox}>
            <div style={s.spinner} />
            <p style={{ marginTop: 12, color: '#374151', fontWeight: 600 }}>Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyBox}>
            <span style={{ fontSize: 40 }}>👥</span>
            <p style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>
              {search ? `No users found for "${search}"` : 'No users found'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>User</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Location</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, position: 'sticky', right: 0, background: '#e0e7ff' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.jobseeker;
                  const active = isActive(u);
                  const busy = acting === u.id;
                  return (
                    <tr key={u.id} style={s.tr}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>

                      <td style={s.td}>
                        <div style={s.userCell}>
                          <div style={s.avatar}>{u.username?.[0]?.toUpperCase() ?? '?'}</div>
                          <div>
                            <div style={s.username}>{u.username}</div>
                            <div style={s.userSub}>ID #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={s.td}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.email}</span>
                      </td>

                      <td style={s.td}>
                        <span style={{ ...s.badge, background: rc.bg, color: rc.color, border: `2px solid ${rc.border}` }}>
                          {u.role}
                        </span>
                      </td>

                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: '#374151' }}>{u.phone || '—'}</span>
                      </td>

                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: '#374151' }}>{u.location || '—'}</span>
                      </td>

                      <td style={s.td}>
                        {active
                          ? <span style={{ ...s.statusBadge, background: '#dcfce7', color: '#15803d' }}>✓ Active</span>
                          : <span style={{ ...s.statusBadge, background: '#fee2e2', color: '#b91c1c' }}>✗ Inactive</span>
                        }
                      </td>

                      {/* Actions */}
                      <td style={{ ...s.td, position: 'sticky', right: 0, background: 'inherit' }}>
                        <div style={s.actions}>
                          {/* Edit */}
                          <button style={{ ...s.actionBtn, ...s.btnBlue }}
                            disabled={busy} onClick={() => openEdit(u)} title="Edit user">
                            ✏️ Edit
                          </button>

                          {/* Activate / Deactivate */}
                          {active ? (
                            <button style={{ ...s.actionBtn, ...s.btnYellow }}
                              disabled={busy} onClick={() => handleDeactivate(u)} title="Deactivate user">
                              {busy ? '…' : '⏸ Deactivate'}
                            </button>
                          ) : (
                            <button style={{ ...s.actionBtn, ...s.btnGreen }}
                              disabled={busy} onClick={() => handleActivate(u)} title="Activate user">
                              {busy ? '…' : '▶ Activate'}
                            </button>
                          )}

                          {/* Delete */}
                          <button style={{ ...s.actionBtn, ...s.btnRed }}
                            disabled={busy} onClick={() => handleDelete(u)} title="Delete user permanently">
                            {busy ? '…' : '🗑 Delete'}
                          </button>
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
          <div style={s.modalOverlay} onClick={() => setEditUser(null)} />
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Edit User</h3>
                <p style={s.modalSub}>@{editUser.username} · {editUser.email}</p>
              </div>
              <button style={s.modalClose} onClick={() => setEditUser(null)}>✕</button>
            </div>

            <div style={s.modalBody}>
              {[
                { label: 'Username', key: 'username', placeholder: 'e.g. john_doe' },
                { label: 'Email', key: 'email', placeholder: 'e.g. user@example.com' },
                { label: 'Phone', key: 'phone', placeholder: 'e.g. +251911234567' },
                { label: 'Location', key: 'location', placeholder: 'e.g. Addis Ababa' },
                { label: 'Bio', key: 'bio', placeholder: 'Short bio...' },
              ].map(f => (
                <div key={f.key} style={s.formField}>
                  <label style={s.formLabel}>{f.label}</label>
                  <input style={s.formInput}
                    value={(editForm as any)[f.key]}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.key === 'email' ? 'email' : 'text'} />
                </div>
              ))}

              <div style={s.formField}>
                <label style={s.formLabel}>Role</label>
                <select style={s.formInput}
                  value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="jobseeker">Job Seeker</option>
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={{ ...s.actionBtn, ...s.btnGray, padding: '9px 20px' }}
                onClick={() => setEditUser(null)}>Cancel</button>
              <button style={{ ...s.actionBtn, ...s.btnPrimary, padding: '9px 24px' }}
                disabled={acting === editUser.id} onClick={handleEditSave}>
                {acting === editUser.id ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  pageHeader:   { marginBottom: 20 },
  pageTitle:    { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 },
  pageSub:      { fontSize: 14, color: '#6b7280' },

  alertSuccess: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#15803d', fontWeight: 600, fontSize: 14 },
  alertError:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#b91c1c', fontWeight: 600, fontSize: 14 },
  alertClose:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', opacity: 0.7 },

  searchBar:       { background: '#dbeafe', borderRadius: 14, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const },
  searchInputWrap: { flex: 1, minWidth: 220, position: 'relative' as const, display: 'flex', alignItems: 'center' },
  searchIcon:      { position: 'absolute' as const, left: 12, fontSize: 14, pointerEvents: 'none' as const },
  searchInput:     { width: '100%', paddingLeft: 36, paddingRight: 32, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '2px solid #93c5fd', fontSize: 14, fontWeight: 600, color: '#111827', background: '#fff', outline: 'none' },
  clearBtn:        { position: 'absolute' as const, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14 },
  filterRow:       { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  filterBtn:       { padding: '7px 14px', borderRadius: 20, border: '1px solid #c7d2fe', background: '#fff', fontSize: 12, fontWeight: 700, color: '#4b5563', cursor: 'pointer' },
  filterActive:    { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' },
  totalBadge:      { fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', borderRadius: 10, padding: '6px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },

  tableWrap:  { background: '#e0e7ff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  loadingBox: { padding: 48, textAlign: 'center' as const, background: '#fff', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  spinner:    { width: 40, height: 40, border: '3px solid #e0e7ff', borderTop: '3px solid #7c3aed', borderRadius: '50%' },
  emptyBox:   { padding: 48, textAlign: 'center' as const, background: '#fff', color: '#6b7280' },

  table:  { width: '100%', borderCollapse: 'collapse' as const, minWidth: 780 },
  thead:  { background: '#e0e7ff' },
  th:     { padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const },
  tr:     { borderBottom: '1px solid #e0e7ff', background: '#fff', transition: 'background 0.1s' },
  td:     { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' as const },

  userCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0, boxShadow: '0 2px 6px rgba(124,58,237,0.3)' },
  username:   { fontWeight: 700, fontSize: 14, color: '#111827' },
  userSub:    { fontSize: 11, color: '#7c3aed', fontWeight: 600 },
  badge:      { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 },
  statusBadge:{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 },

  actions:    { display: 'flex', gap: 5, flexWrap: 'wrap' as const },
  actionBtn:  { padding: '5px 11px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' as const, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnBlue:    { background: '#dbeafe', color: '#1d4ed8' },
  btnGreen:   { background: '#dcfce7', color: '#15803d' },
  btnYellow:  { background: '#fef3c7', color: '#b45309' },
  btnRed:     { background: '#fee2e2', color: '#b91c1c' },
  btnGray:    { background: '#f3f4f6', color: '#374151' },
  btnPrimary: { background: '#7c3aed', color: '#fff' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 },
  modal:        { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0' },
  modalTitle:   { fontSize: 17, fontWeight: 800, color: '#111827' },
  modalSub:     { fontSize: 13, color: '#6b7280', marginTop: 2 },
  modalClose:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 4 },
  modalBody:    { padding: '16px 24px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' },
  formField:    { display: 'flex', flexDirection: 'column' as const, gap: 5 },
  formLabel:    { fontSize: 12, fontWeight: 700, color: '#374151' },
  formInput:    { padding: '10px 13px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#f9fafb', outline: 'none' },
};
