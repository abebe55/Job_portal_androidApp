/**
 * WebLayout — wraps every tab/page on web with a MusicFlow-style sidebar.
 * On native (iOS/Android) it renders children directly — no sidebar.
 *
 * Usage:
 *   <WebLayout title="Dashboard" subtitle="Overview of your jobs">
 *     {children}
 *   </WebLayout>
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// ── Design tokens (matches MusicFlow / sample project) ────────────────────────
const SIDEBAR_W  = 220;
const HEADER_H   = 56;
const BG         = '#f8f9fc';
const SURFACE    = '#ffffff';
const BORDER     = '#e5e7eb';
const TEXT       = '#1a1a2e';
const TEXT_SUB   = '#6b7280';
const TEXT_MUTED = '#9ca3af';
const PRIMARY    = '#6c63ff';
const PRIMARY_LT = '#f0eeff';
const DANGER     = '#ef4444';

// ── Nav items per role ────────────────────────────────────────────────────────
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
    { icon: 'home-outline',            label: t('employerDashboard'), path: '/(tabs)/' },
    { icon: 'add-circle-outline',      label: t('postJob'),           path: '/post-job' },
    { icon: 'list-outline',            label: t('myPostedJobs'),      path: '/my-jobs' },
    { icon: 'wallet-outline',          label: t('myWallet'),          path: '/wallet' },
    { icon: 'person-outline',          label: t('profile'),           path: '/(tabs)/profile' },
  ];
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router   = useRouter();
  const pathname = usePathname();

  const seekerNav   = useSeekerNav();
  const employerNav = useEmployerNav();
  const navItems    = user?.role === 'employer' ? employerNav : seekerNav;

  const isActive = (path: string) =>
    pathname === path || (path === '/(tabs)/' && (pathname === '/' || pathname === ''));

  const go = (path: string) => router.push(path as any);

  const handleLogout = () => { logout(); router.replace('/(auth)/login'); };

  return (
    <View style={sb.sidebar}>
      {/* Brand */}
      <View style={sb.brand}>
        <View style={sb.brandIcon}>
          <Ionicons name="briefcase" size={18} color={PRIMARY} />
        </View>
        <View>
          <Text style={sb.brandName}>JobPortal</Text>
          <Text style={sb.brandSub}>
            {user?.role === 'employer' ? 'Employer Panel' : 'Job Seeker'}
          </Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={sb.navSection}>
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={[sb.navItem, active && sb.navItemActive]}
                onPress={() => go(item.path)}
              >
                <View style={[sb.navIcon, active && sb.navIconActive]}>
                  <Ionicons
                    name={item.icon as any}
                    size={17}
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

      {/* User + logout */}
      <View style={sb.footer}>
        <View style={sb.userRow}>
          <View style={sb.userAvatar}>
            <Text style={sb.userAvatarText}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={sb.userName} numberOfLines={1}>{user?.username}</Text>
            <Text style={sb.userEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={sb.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color={DANGER} />
          <Text style={sb.logoutText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Header bar ────────────────────────────────────────────────────────────────
function WebHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={hd.header}>
      <View style={hd.left}>
        <Text style={hd.title}>{title}</Text>
        {subtitle ? (
          <>
            <Text style={hd.dot}>·</Text>
            <Text style={hd.subtitle}>{subtitle}</Text>
          </>
        ) : null}
      </View>
      <View style={hd.right}>
        {action}
      </View>
    </View>
  );
}

// ── WebLayout ─────────────────────────────────────────────────────────────────
interface WebLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Optional element shown on the right of the header (e.g. "Add" button) */
  action?: React.ReactNode;
}

export default function WebLayout({
  children, title, subtitle, action,
}: WebLayoutProps) {
  // On native: render children only (PageHeader handles the header)
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={wl.shell}>
      <Sidebar />
      <View style={wl.main}>
        <WebHeader title={title} subtitle={subtitle} action={action} />
        <View style={wl.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sb = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: SURFACE,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh' as any,
    position: 'sticky' as any,
    top: 0,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: PRIMARY_LT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 18 },
  brandSub:  { fontSize: 11, color: TEXT_MUTED },

  navSection: { padding: '14px 10px' as any },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    marginBottom: 2,
  },
  navItemActive:  { backgroundColor: PRIMARY_LT },
  navIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconActive:  { backgroundColor: '#e0dbff' },
  navLabel:       { fontSize: 14, color: TEXT_SUB, fontWeight: '500' },
  navLabelActive: { color: PRIMARY, fontWeight: '600' },

  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 14,
  },
  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  userAvatar:    { width: 32, height: 32, borderRadius: 16, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  userAvatarText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  userName:      { fontSize: 13, fontWeight: '600', color: TEXT },
  userEmail:     { fontSize: 11, color: TEXT_MUTED },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8 },
  logoutText:    { fontSize: 13, fontWeight: '600', color: DANGER },
});

const hd = StyleSheet.create({
  header: {
    height: HEADER_H,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    position: 'sticky' as any,
    top: 0,
    zIndex: 30,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title:    { fontSize: 16, fontWeight: '700', color: TEXT },
  dot:      { fontSize: 14, color: BORDER },
  subtitle: { fontSize: 14, color: TEXT_MUTED },
  right:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

const wl = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: BG,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: '100vh' as any,
    overflow: 'auto' as any,
  },
  content: {
    flex: 1,
    padding: 28,
    maxWidth: 1200,
    width: '100%',
  },
});
