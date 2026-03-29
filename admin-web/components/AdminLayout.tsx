'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard',                    label: 'Dashboard',          icon: '⊞', color: '#7c3aed' },
  { href: '/dashboard/jobs',               label: 'Job Approvals',      icon: '◈', color: '#2563eb' },
  { href: '/dashboard/employer-approvals', label: 'Employer Approvals', icon: '◉', color: '#d97706' },
  { href: '/dashboard/users',              label: 'Users',              icon: '◎', color: '#16a34a' },
  { href: '/dashboard/commission',         label: 'Commission',         icon: '◇', color: '#0891b2' },
  { href: '/dashboard/transactions',       label: 'Transactions',       icon: '◆', color: '#ef4444' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // sidebar closed by default

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) router.replace('/');
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/');
  };

  return (
    <div style={st.shell}>

      {/* ── Overlay (click outside to close) ── */}
      {open && (
        <div style={st.overlay} onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar (only visible when open) ── */}
      {open && (
        <aside style={st.sidebar}>

          {/* Brand + close button */}
          <div style={st.brand}>
            <div style={st.brandLogo}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#7c3aed' }}>JP</span>
            </div>
            <span style={st.brandText}>JobPortal</span>
            {/* X close button */}
            <button style={st.closeBtn} onClick={() => setOpen(false)} aria-label="Close menu">
              ✕
            </button>
          </div>

          {/* Nav items */}
          <nav style={st.nav}>
            {NAV.map(n => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  style={{ ...st.navItem, ...(active ? st.navActive : {}) }}
                  onClick={() => setOpen(false)}
                >
                  <span style={{
                    ...st.navIcon,
                    background: active ? n.color : '#f3f4f6',
                    color: active ? '#fff' : n.color,
                  }}>
                    {n.icon}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#111' : '#374151',
                  }}>
                    {n.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>›</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <button style={st.signOutBtn} onClick={logout}>
            <span style={{ ...st.navIcon, background: '#fee2e2', color: '#ef4444', fontSize: 16 }}>⏻</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>Sign Out</span>
          </button>

        </aside>
      )}

      {/* ── Main area ── */}
      <div style={st.mainWrap}>

        {/* Top bar — hamburger only shows when sidebar is closed */}
        <header style={st.topBar}>
          {!open && (
            <button style={st.hamburger} onClick={() => setOpen(true)} aria-label="Open menu">
              <span style={st.hLine} />
              <span style={st.hLine} />
              <span style={st.hLine} />
            </button>
          )}
          <span style={st.topBarTitle}>
            {NAV.find(n => n.href === pathname)?.label ?? 'Admin'}
          </span>
          <span style={st.topBarBadge}>Admin</span>
        </header>

        {/* Page content */}
        <main style={st.main}>{children}</main>
      </div>

    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#f5f6fa', position: 'relative' },

  /* Dim overlay behind sidebar */
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.25)',
    zIndex: 40,
  },

  /* Sidebar — fixed, slides over content */
  sidebar: {
    position: 'fixed', top: 0, left: 0,
    width: 220, height: '100vh',
    background: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column',
    zIndex: 50,
    boxShadow: '4px 0 24px rgba(0,0,0,0.10)',
  },

  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '18px 14px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  brandLogo: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: '#ede9fe',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandText: { fontSize: 16, fontWeight: 800, color: '#111827', flex: 1 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#6b7280', padding: '4px 6px',
    borderRadius: 6, lineHeight: 1,
  },

  nav: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '10px 10px', gap: 2, overflowY: 'auto',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 10px', borderRadius: 10,
    textDecoration: 'none', background: 'transparent',
    transition: 'background 0.12s',
  },
  navActive: { background: '#f5f3ff' },
  navIcon: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700,
  },

  signOutBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '8px 10px 24px', padding: '10px 10px',
    borderRadius: 10, border: 'none', background: 'transparent',
    cursor: 'pointer',
  },

  /* Main */
  mainWrap: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' },

  topBar: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '0 20px', height: 54,
    background: '#7c3aed',
    position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
  },
  hamburger: {
    display: 'flex', flexDirection: 'column', gap: 5,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 4px', borderRadius: 6, flexShrink: 0,
  },
  hLine: {
    display: 'block', width: 20, height: 2,
    background: '#fff', borderRadius: 2,
  },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: 700, color: '#fff' },
  topBarBadge: {
    fontSize: 11, fontWeight: 700, color: '#7c3aed',
    background: '#fff', borderRadius: 20, padding: '3px 12px',
  },

  main: { flex: 1, padding: '24px 60px', overflowY: 'auto' },
};
