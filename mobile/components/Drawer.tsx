import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, TouchableWithoutFeedback, ScrollView, Modal,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C } from '../constants/theme';

const W = Dimensions.get('window').width;
const DRAWER_W = Math.min(W * 0.72, 280);

type NavItem = { icon: string; label: string; path: string };
type Props = { visible: boolean; onClose: () => void };

// ── Employer-only nav items ───────────────────────────────────────────────────
const EMPLOYER_ITEMS: NavItem[] = [
  { icon: 'add-circle-outline',  label: 'Post a Job',      path: '/post-job' },
  { icon: 'list-outline',        label: 'My Posted Jobs',  path: '/my-jobs' },
  { icon: 'wallet-outline',      label: 'My Wallet',       path: '/wallet' },
];

// ── Job-seeker nav items ──────────────────────────────────────────────────────
const SEEKER_ITEMS: NavItem[] = [
  { icon: 'briefcase-outline',        label: 'Browse Jobs',      path: '/(tabs)/' },
  { icon: 'search-outline',           label: 'Search Jobs',      path: '/(tabs)/search' },
  { icon: 'create-outline',           label: 'Create CV',        path: '/(tabs)/cv' },
  { icon: 'document-text-outline',    label: 'My CV',            path: '/(tabs)/mycv' },
  { icon: 'checkmark-circle-outline', label: 'My Applications',  path: '/(tabs)/applications' },
];

// ── Common items ──────────────────────────────────────────────────────────────
const COMMON_ITEMS: NavItem[] = [
  { icon: 'person-outline', label: 'Profile', path: '/(tabs)/profile' },
];

export default function Drawer({ visible, onClose }: Props) {
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isEmployer = user?.role === 'employer';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : -DRAWER_W, duration: 260, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: visible ? 1 : 0,          duration: 260, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const go = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as any), 220);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => { logout(); router.replace('/(auth)/login'); }, 220);
  };

  const isActive = (path: string) =>
    pathname === path || (path === '/(tabs)/' && pathname === '/');

  const renderItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <TouchableOpacity
        key={item.path}
        style={[styles.menuItem, active && styles.menuItemActive]}
        onPress={() => go(item.path)}
      >
        <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
          <Ionicons name={item.icon as any} size={18} color={active ? '#fff' : C.primary} />
        </View>
        <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
        {active
          ? <View style={styles.activeBar} />
          : <Ionicons name="chevron-forward" size={14} color={C.border} />
        }
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: NavItem[], color = C.primary) => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      {items.map(renderItem)}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fade }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
            <Text style={styles.drawerName}>{user?.username}</Text>
            <Text style={styles.drawerEmail}>{user?.email}</Text>
            <View style={[styles.roleBadge, isEmployer && styles.roleBadgeEmployer]}>
              <Text style={styles.roleBadgeText}>
                {isEmployer ? '🏢 Employer' : '🔍 Job Seeker'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>

            {/* ── EMPLOYER SECTION ── */}
            {isEmployer && (
              <>
                {renderSection('Employer', EMPLOYER_ITEMS, '#2563eb')}
                <View style={styles.divider} />
              </>
            )}

            {/* ── JOB SEEKER SECTION ── */}
            {renderSection(isEmployer ? 'Job Seeker' : 'Menu', SEEKER_ITEMS)}

            <View style={styles.divider} />

            {/* ── COMMON ── */}
            {COMMON_ITEMS.map(renderItem)}

            <View style={styles.divider} />

            {/* Sign out */}
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="log-out-outline" size={18} color={C.danger} />
              </View>
              <Text style={[styles.menuLabel, { color: C.danger }]}>Sign Out</Text>
            </TouchableOpacity>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  drawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W,
    backgroundColor: C.white,
    shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 24,
  },
  drawerHeader: {
    backgroundColor: C.primary,
    paddingTop: 36, paddingBottom: 16, paddingHorizontal: 20,
  },
  avatar:        { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText:    { fontSize: 24, fontWeight: '700', color: '#fff' },
  drawerName:    { fontSize: 17, fontWeight: '700', color: '#fff' },
  drawerEmail:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, marginBottom: 8 },
  roleBadge:     { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleBadgeEmployer: { backgroundColor: 'rgba(37,99,235,0.35)' },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  menuScroll:    { flex: 1, paddingTop: 4 },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  sectionTitle:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },

  menuItem:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 12 },
  menuItemActive:    { backgroundColor: C.primaryLight, borderRadius: 12, marginHorizontal: 8 },
  menuIconWrap:      { width: 34, height: 34, borderRadius: 9, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  menuIconWrapActive:{ backgroundColor: C.primary },
  menuLabel:         { flex: 1, fontSize: 14, color: '#1a1a2e', fontWeight: '700' },
  menuLabelActive:   { color: C.primary },
  activeBar:         { width: 4, height: 20, backgroundColor: C.primary, borderRadius: 2 },
  divider:           { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16, marginVertical: 4 },
});
