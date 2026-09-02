import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Switch, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { C, S } from '../../constants/theme';
import WebLayout from '../../components/WebLayout';

type MenuItem = { icon: string; label: string; path: string; color?: string };

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const { t }            = useTranslation();
  const [isAmharic, setIsAmharic] = useState(i18n.language === 'am');

  const toggleLanguage = (val: boolean) => {
    setIsAmharic(val);
    i18n.changeLanguage(val ? 'am' : 'en');
  };

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'), style: 'destructive',
        onPress: () => { logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  const employerItems: MenuItem[] = [
    { icon: 'wallet-outline',      label: t('myWallet'),      path: '/wallet',    color: '#10b981' },
    { icon: 'add-circle-outline',  label: t('postJob'),       path: '/post-job',  color: C.primary },
    { icon: 'list-outline',        label: t('myPostedJobs'),  path: '/my-jobs',   color: C.primary },
  ];

  const commonItems: MenuItem[] = [
    { icon: 'document-text-outline',   label: t('myCV'),          path: '/(tabs)/cv' },
    { icon: 'checkmark-circle-outline',label: t('myApplications'),path: '/(tabs)/applications' },
  ];

  const initials = (user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <WebLayout title={t('profile')} subtitle="Manage your account">
    <ScrollView
      style={S.page}
      contentContainerStyle={[S.content, { paddingTop: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={st.profileCard}>
        <View style={st.avatar}>
          <Text style={st.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.name} numberOfLines={1}>{user?.username}</Text>
          <Text style={st.email} numberOfLines={1}>{user?.email}</Text>
        </View>
        <View style={[st.roleBadge, user?.role === 'employer' && st.roleBadgeEmployer]}>
          <Text style={[st.roleBadgeText, user?.role === 'employer' && { color: '#2563eb' }]}>
            {user?.role === 'employer' ? t('roleBadgeEmployer') : t('roleBadgeSeeker')}
          </Text>
        </View>
      </View>

      {/* Status row */}
      <View style={st.statusRow}>
        <View style={[st.statusChip, user?.email_verified ? st.chipGreen : st.chipOrange]}>
          <Ionicons
            name={user?.email_verified ? 'checkmark-circle' : 'alert-circle'}
            size={13}
            color={user?.email_verified ? '#10b981' : '#d97706'}
          />
          <Text style={[st.chipText, { color: user?.email_verified ? '#10b981' : '#d97706' }]}>
            {user?.email_verified ? 'Email verified' : 'Email unverified'}
          </Text>
        </View>
        {user?.role === 'employer' && (
          <View style={[st.statusChip, user?.is_approved ? st.chipGreen : st.chipOrange]}>
            <Ionicons
              name={user?.is_approved ? 'shield-checkmark' : 'time'}
              size={13}
              color={user?.is_approved ? '#10b981' : '#d97706'}
            />
            <Text style={[st.chipText, { color: user?.is_approved ? '#10b981' : '#d97706' }]}>
              {user?.is_approved ? 'Account approved' : 'Pending approval'}
            </Text>
          </View>
        )}
      </View>

      {/* Language */}
      <View style={st.section}>
        <Text style={S.sectionTitle}>{t('language')}</Text>
        <View style={st.langRow}>
          <Text style={[st.langLabel, !isAmharic && st.langActive]}>English</Text>
          <Switch
            value={isAmharic}
            onValueChange={toggleLanguage}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor={C.white}
          />
          <Text style={[st.langLabel, isAmharic && st.langActive]}>አማርኛ</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={st.section}>
        <Text style={S.sectionTitle}>{t('menu')}</Text>
        {user?.role === 'employer' && employerItems.map(item => (
          <MenuItem key={item.path} item={item} onPress={() => router.push(item.path as any)} />
        ))}
        {commonItems.map(item => (
          <MenuItem key={item.path} item={item} onPress={() => router.push(item.path as any)} />
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={st.signOutBtn} onPress={handleLogout}>
        <View style={st.signOutIcon}>
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
        </View>
        <Text style={st.signOutText}>{t('signOut')}</Text>
        <Ionicons name="chevron-forward" size={16} color={C.danger} />
      </TouchableOpacity>
    </ScrollView>
    </WebLayout>
  );
}

function MenuItem({ item, onPress }: { item: { icon: string; label: string; color?: string }; onPress: () => void }) {
  const color = item.color ?? C.primary;
  return (
    <TouchableOpacity style={st.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[st.menuIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={item.icon as any} size={18} color={color} />
      </View>
      <Text style={st.menuLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.border} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: C.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 22, fontWeight: '800', color: '#fff' },
  name:         { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
  email:        { fontSize: 12, color: C.textSub },
  roleBadge:    { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleBadgeEmployer: { backgroundColor: '#dbeafe' },
  roleBadgeText:{ color: C.primary, fontSize: 11, fontWeight: '700' },

  statusRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipGreen:    { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  chipOrange:   { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  chipText:     { fontSize: 12, fontWeight: '600' },

  section: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  langRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  langLabel: { fontSize: 14, color: C.textSub, fontWeight: '600' },
  langActive:{ color: C.primary, fontWeight: '700' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel:    { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.dangerLight, borderRadius: 14, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#fca5a5',
  },
  signOutIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  signOutText: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 15 },
});
