'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/jobs',
    label: 'Job Approvals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/employer-approvals',
    label: 'Employers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/commission',
    label: 'Commission',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/transactions',
    label: 'Transactions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      router.replace('/');
    } else {
      setChecked(true);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/');
  };

  const currentPage = NAV.find(n => n.href === pathname) ?? NAV.find(n => pathname.startsWith(n.href + '/'));

  if (!checked) return null;

  return (
    <div style={s.shell}>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div style={s.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, ...(mobileOpen ? s.sidebarOpen : {}) }} aria-label="Main navigation">

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandLogo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={s.brandName}>JobPortal</div>
            <div style={s.brandSub}>Admin Panel</div>
          </div>
          <button style={s.closeBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  ...s.navItem,
                  ...(active ? s.navItemActive : {}),
                }}
              >
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>
                  {n.icon}
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#6c63ff' : '#6b7280',
                }}>
                  {n.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={s.sidebarFooter}>
          <button style={s.logoutBtn} onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#ef4444' }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={s.mainWrap}>

        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.hamburger} onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={s.headerTitleGroup}>
              <span style={s.headerTitle}>{currentPage?.label ?? 'Admin'}</span>
              <span style={s.headerDot}>·</span>
              <span style={s.headerSub}>JobPortal Admin</span>
            </div>
          </div>
          <div style={s.headerRight}>
            <span style={s.adminBadge}>Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main style={s.main}>{children}</main>
      </div>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)',
  },

  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 40,
  },

  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 50,
    /* mobile: hidden off-screen */
    transform: 'translateX(0)',
  },
  sidebarOpen: {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
  },
  brandLogo: {
    width: 34, height: 34,
    borderRadius: 'var(--radius-md)',
    background: 'var(--primary-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: {
    fontSize: 15, fontWeight: 700,
    color: 'var(--text)', lineHeight: 1.2,
  },
  brandSub: {
    fontSize: 11, color: 'var(--text-muted)',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-sub)', padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'none', /* shown via @media in real CSS; in inline we show it only on mobile */
  },

  nav: {
    flex: 1,
    padding: '14px 10px',
    display: 'flex', flexDirection: 'column', gap: 2,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    background: 'transparent',
    transition: 'background var(--transition-fast)',
  },
  navItemActive: {
    background: 'var(--sidebar-active)',
  },
  navIcon: {
    width: 32, height: 32,
    borderRadius: 'var(--radius-md)',
    background: 'var(--border-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--text-sub)',
    transition: 'all var(--transition-fast)',
  },
  navIconActive: {
    background: '#e0dbff',
    color: 'var(--primary)',
  },

  sidebarFooter: {
    padding: '12px 10px 20px',
    borderTop: '1px solid var(--border)',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    border: 'none', cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },

  mainWrap: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    minWidth: 0,
    minHeight: '100vh',
  },

  header: {
    height: 'var(--header-height)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky', top: 0, zIndex: 30,
    boxShadow: 'var(--shadow-sm)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },

  hamburger: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  headerTitleGroup: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontSize: 15, fontWeight: 700,
    color: 'var(--text)',
  },
  headerDot: { color: 'var(--border)', fontSize: 15 },
  headerSub: {
    fontSize: 13, color: 'var(--text-muted)',
  },

  adminBadge: {
    fontSize: 11, fontWeight: 700,
    color: 'var(--primary)',
    background: 'var(--primary-light)',
    borderRadius: 'var(--radius-full)',
    padding: '4px 14px',
    border: '1px solid #d4cfff',
  },

  main: {
    flex: 1,
    padding: '28px 32px 40px',
    maxWidth: 1440,
    width: '100%',
  },
};
