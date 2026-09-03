/**
 * WebLayout — sidebar layout on web, transparent wrapper on native.
 * Content fills the FULL available width — no centering, no maxWidth.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_W = 210;
const HEADER_H  = 52;
const BG        = '#f8f9fc';
const SURFACE   = '#ffffff';
const BORDER    = '#e5e7eb';
const TEXT      = '#1a1a2e';
const TEXT_SUB  = '#6b7280';
const TEXT_MUTED= '#9ca3af';
const PRIMARY   = '#6c63ff';
const PRIMARY_LT= '#f0eeff';
const DANGER    = '#ef4444';

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

function Sidebar() {
  const { user, logout } = useAuth();
  const { t }    = useTranslation();
  const router   = useRouter();
  const pathname = usePathname();

  const nav = user?.role === 'employer' ? useEmployerNav() : useSeekerNav();

  const isActive = (p: string) =>
    pathname === p || (p === '/(tabs)/' && (pathname === '/' || pathname === ''));

  return (
    <View style={sb.sidebar}>
      {/* Brand */}
      <View style={sb.brand}>
        <View style={sb.brandIcon}>
          <Ionicons name="briefcase" size={17} color={PRIMARY} />
        </View>
        <View>
          <Text style={sb.brandName}>JobPortal</Text>
          <Text style={sb.brandSub}>{user?.role === 'employer' ? 'Employer' : 'Job Seeker'}</Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={sb.navWrap}>
          {nav.map(item => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={[sb.navItem, active && sb.navActive]}
                onPress={() => router.push(item.path as any)}
              >
                <Ionicons name={item.icon as any} size={16} color={active ? PRIMARY : TEXT_SUB} />
                <Text style={[sb.navLabel, active && sb.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* User footer */}
      <View style={sb.footer}>
        <View style={sb.userRow}>
          <View style={sb.avatar}>
            <Text style={sb.avatarTxt}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={sb.userName} numberOfLines={1}>{user?.username}</Text>
            <Text style={sb.userEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={sb.logoutBtn} onPress={() => { logout(); router.replace('/(auth)/login'); }}>
          <Ionicons name="log-out-outline" size={15} color={DANGER} />
          <Text style={sb.logoutTxt}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WebHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={hd.bar}>
      <View style={hd.left}>
        <Text style={hd.title}>{title}</Text>
        {subtitle ? <><Text style={hd.dot}>·</Text><Text style={hd.sub}>{subtitle}</Text></> : null}
      </View>
      {action ? <View style={hd.right}>{action}</View> : null}
    </View>
  );
}

interface Props { children: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; }

export default function WebLayout({ children, title, subtitle, action }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={wl.shell}>
      <Sidebar />
      <View style={wl.main}>
        <WebHeader title={title} subtitle={subtitle} action={action} />
        {/* content fills 100% of remaining width */}
        <View style={wl.content}>{children}</View>
      </View>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const sb = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W, backgroundColor: SURFACE,
    borderRightWidth: 1, borderRightColor: BORDER,
    flexDirection: 'column',
    height: '100vh' as any,
    position: 'sticky' as any,
    top: 0, flexShrink: 0,
  },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  brandIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: PRIMARY_LT,
    justifyContent: 'center', alignItems: 'center',
  },
  brandName: { fontSize: 14, fontWeight: '700', color: TEXT },
  brandSub:  { fontSize: 11, color: TEXT_MUTED },

  navWrap: { paddingHorizontal: 10, paddingVertical: 12 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: 8, marginBottom: 2,
  },
  navActive:      { backgroundColor: PRIMARY_LT },
  navLabel:       { fontSize: 13, color: TEXT_SUB, fontWeight: '500' },
  navLabelActive: { color: PRIMARY, fontWeight: '600' },

  footer: { borderTopWidth: 1, borderTopColor: BORDER, padding: 12 },
  userRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  userName:   { fontSize: 12, fontWeight: '600', color: TEXT },
  userEmail:  { fontSize: 11, color: TEXT_MUTED },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  logoutTxt:  { fontSize: 12, fontWeight: '600', color: DANGER },
});

const hd = StyleSheet.create({
  bar: {
    height: HEADER_H, backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24,
    position: 'sticky' as any, top: 0, zIndex: 30,
  },
  left:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: TEXT },
  dot:   { fontSize: 13, color: BORDER },
  sub:   { fontSize: 13, color: TEXT_MUTED },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

const wl = StyleSheet.create({
  shell: { flexDirection: 'row', minHeight: '100vh' as any, backgroundColor: BG },
  main:  { flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'auto' as any },
  content: {
    flex: 1,
    padding: 20,
    // NO maxWidth — fills the full remaining width
  },
});
