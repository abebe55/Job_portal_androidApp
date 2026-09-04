/**
 * WebLayout — responsive sidebar layout (web only).
 *
 * Desktop (>= 900px): sidebar is sticky and always visible.
 * Mobile / narrow:    sidebar is hidden; a toggle button in the header
 *                     slides it in as an overlay. Clicking a nav item
 *                     or the overlay closes it.
 *
 * On native (iOS/Android): renders children directly — no sidebar.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

/* ─── tokens ──────────────────────────────────────────────── */
const SIDEBAR_W = 216;
const HEADER_H  = 54;
const BG        = '#f8f9fc';
const SURFACE   = '#ffffff';
const BORDER    = '#e5e7eb';
const TEXT      = '#1a1a2e';
const TEXT_SUB  = '#6b7280';
const TEXT_MUTED= '#9ca3af';
const PRIMARY   = '#6c63ff';
const PRIMARY_LT= '#f0eeff';
const DANGER    = '#ef4444';

/* ─── nav items ───────────────────────────────────────────── */
type NavItem = { icon: string; label: string; path: string };

function useSeekerNav(): NavItem[] {
  const { t } = useTranslation();
  return [
    { icon: 'briefcase-outline',        label: t('browseJobs'),     path: '/(tabs)/' },
    { icon: 'search-outline',           label: t('searchJobs'),     path: '/(tabs)/search' },
    { icon: 'create-outline',           label: t('createCV'),       path: '/(tabs)/cv' },
    { icon: 'document-text-outline',    label: t('myCV'),           path: '/(tabs)/mycv' },
    { icon: 'checkmark-circle-outline', label: t('myApplications'), path: '/(tabs)/applications' },
    { icon: 'person-outline',           label: t('profile'),        path: '/(tabs)/profile' },
  ];
}

function useEmployerNav(): NavItem[] {
  const { t } = useTranslation();
  return [
    { icon: 'home-outline',       label: t('employerDashboard'), path: '/(tabs)/' },
    { icon: 'add-circle-outline', label: t('postJob'),           path: '/post-job' },
    { icon: 'list-outline',       label: t('myPostedJobs'),      path: '/my-jobs' },
    { icon: 'wallet-outline',     label: t('myWallet'),          path: '/wallet' },
    { icon: 'person-outline',     label: t('profile'),           path: '/(tabs)/profile' },
  ];
}

/* ─── Sidebar ─────────────────────────────────────────────── */
interface SidebarProps {
  onClose: () => void;
  isOverlay: boolean; // true on narrow screens → close on nav
}

function Sidebar({ onClose, isOverlay }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t }    = useTranslation();
  const router   = useRouter();
  const pathname = usePathname();

  const seekerNav   = useSeekerNav();
  const employerNav = useEmployerNav();
  const nav = user?.role === 'employer' ? employerNav : seekerNav;

  const isActive = (p: string) =>
    pathname === p || (p === '/(tabs)/' && (pathname === '/' || pathname === ''));

  const navigate = (path: string) => {
    if (isOverlay) onClose();          // close sidebar on mobile after click
    router.push(path as any);
  };

  const handleLogout = () => {
    if (isOverlay) onClose();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={sb.sidebar}>
      {/* Brand */}
      <View style={sb.brand}>
        <View style={sb.brandIcon}>
          <Ionicons name="briefcase" size={17} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sb.brandName}>JobPortal</Text>
          <Text style={sb.brandSub}>
            {user?.role === 'employer' ? 'Employer' : 'Job Seeker'}
          </Text>
        </View>
        {/* X button — only shown when sidebar is overlay */}
        {isOverlay && (
          <TouchableOpacity onPress={onClose} style={sb.closeBtn}>
            <Ionicons name="close" size={20} color={TEXT_SUB} />
          </TouchableOpacity>
        )}
      </View>

      {/* Nav items */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={sb.navWrap}>
          {nav.map(item => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={[sb.navItem, active && sb.navActive]}
                onPress={() => navigate(item.path)}
                activeOpacity={0.7}
              >
                <View style={[sb.navIconWrap, active && sb.navIconActive]}>
                  <Ionicons
                    name={item.icon as any}
                    size={16}
                    color={active ? PRIMARY : TEXT_SUB}
                  />
                </View>
                <Text style={[sb.navLabel, active && sb.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* User footer */}
      <View style={sb.footer}>
        <View style={sb.userRow}>
          <View style={sb.avatar}>
            <Text style={sb.avatarTxt}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={sb.userName} numberOfLines={1}>{user?.username}</Text>
            <Text style={sb.userEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={sb.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={15} color={DANGER} />
          <Text style={sb.logoutTxt}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Header bar ──────────────────────────────────────────── */
interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onToggle: () => void;
  sidebarOpen: boolean;
  isWide: boolean;
}

function Header({ title, subtitle, action, onToggle, sidebarOpen, isWide }: HeaderProps) {
  return (
    <View style={hd.bar}>
      <View style={hd.left}>
        {/* Hamburger — always visible; on desktop toggles persistent sidebar */}
        <TouchableOpacity style={hd.toggleBtn} onPress={onToggle}>
          <Ionicons
            name={sidebarOpen && isWide ? 'menu' : 'menu'}
            size={20}
            color={TEXT_SUB}
          />
        </TouchableOpacity>
        <Text style={hd.title}>{title}</Text>
        {subtitle
          ? <><Text style={hd.dot}>·</Text><Text style={hd.sub}>{subtitle}</Text></>
          : null}
      </View>
      {action ? <View style={hd.right}>{action}</View> : null}
    </View>
  );
}

/* ─── WebLayout ───────────────────────────────────────────── */
interface WebLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function WebLayout({ children, title, subtitle, action }: WebLayoutProps) {
  // On native: just render children
  if (Platform.OS !== 'web') return <>{children}</>;

  const winWidth  = Dimensions.get('window').width;
  const isWide    = winWidth >= 900;

  // Desktop: sidebar open by default; Mobile: closed by default
  const [sidebarOpen, setSidebarOpen] = useState(isWide);

  // Re-evaluate when window resizes
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width >= 900) {
        setSidebarOpen(true);   // always show on desktop
      } else {
        setSidebarOpen(false);  // hide on mobile
      }
    });
    return () => sub?.remove();
  }, []);

  const toggle = () => setSidebarOpen(o => !o);

  return (
    <View style={wl.shell}>

      {/* ── Overlay dim (mobile only, when sidebar is open) ── */}
      {sidebarOpen && !isWide && (
        <TouchableOpacity
          style={wl.overlay}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <View style={[
          wl.sidebarWrap,
          isWide ? wl.sidebarSticky : wl.sidebarOverlay,
        ]}>
          <Sidebar onClose={() => setSidebarOpen(false)} isOverlay={!isWide} />
        </View>
      )}

      {/* ── Main ── */}
      <View style={wl.main}>
        <Header
          title={title}
          subtitle={subtitle}
          action={action}
          onToggle={toggle}
          sidebarOpen={sidebarOpen}
          isWide={isWide}
        />
        <View style={wl.content}>
          {children}
        </View>
      </View>

    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const sb = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: SURFACE,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    flexDirection: 'column',
    height: '100%' as any,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: PRIMARY_LT,
    justifyContent: 'center', alignItems: 'center',
  },
  brandName: { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 17 },
  brandSub:  { fontSize: 11, color: TEXT_MUTED },
  closeBtn:  { padding: 4, marginLeft: 4 },

  navWrap: { paddingHorizontal: 10, paddingVertical: 10 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: 8, marginBottom: 2,
    cursor: 'pointer' as any,
  },
  navActive:      { backgroundColor: PRIMARY_LT },
  navIconWrap: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  navIconActive:  { backgroundColor: '#e0dbff' },
  navLabel:       { fontSize: 13, color: TEXT_SUB, fontWeight: '500', flex: 1 },
  navLabelActive: { color: PRIMARY, fontWeight: '600' },

  footer: { borderTopWidth: 1, borderTopColor: BORDER, padding: 12 },
  userRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar:    { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  userName:  { fontSize: 12, fontWeight: '600', color: TEXT },
  userEmail: { fontSize: 11, color: TEXT_MUTED },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  logoutTxt: { fontSize: 12, fontWeight: '600', color: DANGER },
});

const hd = StyleSheet.create({
  bar: {
    height: HEADER_H,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    flexShrink: 0,
    position: 'sticky' as any,
    top: 0,
    zIndex: 30,
  },
  left:      { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toggleBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE,
    justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer' as any,
  },
  title: { fontSize: 15, fontWeight: '700', color: TEXT },
  dot:   { fontSize: 13, color: BORDER, marginHorizontal: 2 },
  sub:   { fontSize: 13, color: TEXT_MUTED },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

const wl = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: BG,
    position: 'relative' as any,
  },

  /* dim overlay when sidebar is open on mobile */
  overlay: {
    position: 'fixed' as any,
    inset: 0 as any,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 40,
  },

  /* sticky sidebar — desktop, stays in flow */
  sidebarWrap: {
    flexShrink: 0,
  },
  sidebarSticky: {
    position: 'sticky' as any,
    top: 0,
    height: '100vh' as any,
    zIndex: 20,
  },

  /* overlay sidebar — mobile, slides over content */
  sidebarOverlay: {
    position: 'fixed' as any,
    top: 0, left: 0, bottom: 0,
    zIndex: 50,
    boxShadow: '4px 0 24px rgba(0,0,0,0.12)' as any,
  },

  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'auto' as any,
    minHeight: '100vh' as any,
  },

  content: {
    flex: 1,
    padding: 0,   // NO padding from wrapper — each screen owns its own padding
  },
});
