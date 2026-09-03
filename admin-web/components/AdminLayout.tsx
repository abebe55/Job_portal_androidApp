'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    sub: 'Overview of your job platform',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/jobs',
    label: 'Job Approvals',
    sub: 'Review, approve, and manage job postings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/employer-approvals',
    label: 'Employers',
    sub: 'Review employer credentials',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    sub: 'Manage accounts and roles',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/commission',
    label: 'Commission',
    sub: 'Configure job posting fees',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/transactions',
    label: 'Transactions',
    sub: 'Wallet activity across the platform',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checked, setChecked]       = useState(false);
  // Desktop: sidebar open by default; mobile: closed
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNarrow, setIsNarrow]      = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      router.replace('/');
    } else {
      setChecked(true);
    }
  }, []);

  // Detect screen width for responsive behavior
  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < 900;
      setIsNarrow(narrow);
      if (narrow) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/');
  };

  const handleNavClick = () => {
    // Close sidebar after navigation on mobile
    if (isNarrow) setSidebarOpen(false);
  };

  const currentPage = NAV.find(n => n.href === pathname)
    ?? NAV.find(n => pathname.startsWith(n.href + '/'))
    ?? NAV[0];

  if (!checked) return null;

  return (
    <div className="jp-shell">

      {/* Dim overlay on mobile when sidebar open */}
      {sidebarOpen && isNarrow && (
        <div className="jp-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside
          className="jp-sidebar open"
          aria-label="Main navigation"
          style={isNarrow ? {
            position: 'fixed', top: 0, left: 0, bottom: 0,
            zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          } : {
            position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
          }}
        >
          <div className="jp-brand">
            <div className="jp-brand-logo">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="jp-brand-name">JobPortal</div>
              <div className="jp-brand-sub">Admin Console</div>
            </div>
            {/* X close button — always visible */}
            <button
              className="jp-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              style={{ display: 'flex' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <nav className="jp-nav">
            {NAV.map(n => {
              const active = pathname === n.href
                || (n.href !== '/dashboard' && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={handleNavClick}
                  className={`jp-nav-item${active ? ' active' : ''}`}
                >
                  {n.icon}
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="jp-sidebar-footer">
            <button className="jp-logout" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log out
            </button>
          </div>
        </aside>
      )}

      {/* ── Main area ── */}
      <div className="jp-main-wrap">
        <header className="jp-header">
          <div className="jp-header-left">
            {/* Hamburger — always visible, toggles sidebar on both desktop and mobile */}
            <button
              className="jp-hamburger"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
              style={{ display: 'flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <div className="jp-header-title">{currentPage.label}</div>
              <div className="jp-header-sub">{currentPage.sub}</div>
            </div>
          </div>
          <div className="jp-header-right">
            <div className="jp-avatar" title="Admin">A</div>
          </div>
        </header>

        <main className="jp-main">{children}</main>
      </div>
    </div>
  );
}
