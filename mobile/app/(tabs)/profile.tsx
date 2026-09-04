import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { C, S } from '../../constants/theme';
import WebLayout from '../../components/WebLayout';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const { t }            = useTranslation();
  const [isAmharic, setIsAmharic] = useState(i18n.language === 'am');

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const employerItems = [
    { icon: 'wallet-outline',      label: t('myWallet'),     path: '/wallet',           color: '#10b981' },
    { icon: 'add-circle-outline',  label: t('postJob'),      path: '/post-job',          color: C.primary },
    { icon: 'list-outline',        label: t('myPostedJobs'), path: '/my-jobs',            color: C.primary },
  ];
  const commonItems = [
    { icon: 'document-text-outline',    label: t('myCV'),          path: '/(tabs)/cv' },
    { icon: 'checkmark-circle-outline', label: t('myApplications'),path: '/(tabs)/applications' },
  ];

  return (
    <WebLayout title={t('profile')} subtitle="Manage your account">
      <ScrollView style={S.page} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Top: profile card + status chips side by side */}
        <View style={st.topRow}>
          {/* Profile card */}
          <View style={[st.card, st.profileCard]}>
            <View style={st.avatarWrap}>
              <Text style={st.avatarTxt}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} numberOfLines={1}>{user?.username}</Text>
              <Text style={st.email} numberOfLines={1}>{user?.email}</Text>
            </View>
            <View style={[st.roleBadge, user?.role === 'employer' && st.roleBadgeEmp]}>
              <Text style={[st.roleTxt, user?.role === 'employer' && { color: '#2563eb' }]}>
                {user?.role === 'employer' ? t('roleBadgeEmployer') : t('roleBadgeSeeker')}
              </Text>
            </View>
          </View>

          {/* Status chips */}
          <View style={st.chipsCol}>
            <View style={[st.chip, user?.email_verified ? st.chipGreen : st.chipOrange]}>
              <Ionicons name={user?.email_verified ? 'checkmark-circle' : 'alert-circle'} size={13} color={user?.email_verified ? '#10b981' : '#d97706'} />
              <Text style={[st.chipTxt, { color: user?.email_verified ? '#10b981' : '#d97706' }]}>
                {user?.email_verified ? 'Email verified' : 'Email unverified'}
              </Text>
            </View>
            {user?.role === 'employer' && (
              <View style={[st.chip, user?.is_approved ? st.chipGreen : st.chipOrange]}>
                <Ionicons name={user?.is_approved ? 'shield-checkmark' : 'time'} size={13} color={user?.is_approved ? '#10b981' : '#d97706'} />
                <Text style={[st.chipTxt, { color: user?.is_approved ? '#10b981' : '#d97706' }]}>
                  {user?.is_approved ? 'Account approved' : 'Pending approval'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 2-column row: Language + Menu */}
        <View style={st.twoCol}>
          {/* Language */}
          <View style={[st.card, { flex: 1 }]}>
            <Text style={st.sectionLbl}>{t('language')}</Text>
            <View style={st.langRow}>
              <Text style={[st.langTxt, !isAmharic && st.langActive]}>English</Text>
              <Switch
                value={isAmharic}
                onValueChange={v => { setIsAmharic(v); i18n.changeLanguage(v ? 'am' : 'en'); }}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
              <Text style={[st.langTxt, isAmharic && st.langActive]}>አማርኛ</Text>
            </View>
          </View>

          {/* Menu */}
          <View style={[st.card, { flex: 2 }]}>
            <Text style={st.sectionLbl}>{t('menu')}</Text>
            {user?.role === 'employer' && employerItems.map(item => (
              <MenuItem key={item.path} item={item} onPress={() => router.push(item.path as any)} />
            ))}
            {commonItems.map(item => (
              <MenuItem key={item.path} item={item} onPress={() => router.push(item.path as any)} />
            ))}
          </View>
        </View>

        {/* Sign out — white bg + red text outline button */}
        <TouchableOpacity style={st.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color={C.danger} />
          <Text style={st.signOutTxt}>{t('signOut')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </WebLayout>
  );
}

function MenuItem({ item, onPress }: { item: { icon: string; label: string; color?: string }; onPress: () => void }) {
  const color = item.color ?? C.primary;
  return (
    <TouchableOpacity style={st.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[st.menuIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={item.icon as any} size={15} color={color} />
      </View>
      <Text style={st.menuLbl}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.border} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  scroll:  { paddingHorizontal: 16, paddingBottom: 24 },

  topRow:  { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  card: {
    backgroundColor: C.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 2, minWidth: 260 },
  avatarWrap:  { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarTxt:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 15, fontWeight: '700', color: C.text },
  email:       { fontSize: 12, color: C.textSub, marginTop: 1 },
  roleBadge:   { backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  roleBadgeEmp:{ backgroundColor: '#dbeafe' },
  roleTxt:     { color: C.primary, fontSize: 11, fontWeight: '700' },

  chipsCol:   { flexDirection: 'column', gap: 6, justifyContent: 'center', minWidth: 140 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipGreen:  { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  chipOrange: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  chipTxt:    { fontSize: 12, fontWeight: '600' },

  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'stretch' },
  sectionLbl: { fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  langRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  langTxt:    { fontSize: 13, color: C.textSub, fontWeight: '600' },
  langActive: { color: C.primary, fontWeight: '700' },

  menuItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  menuIcon:   { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLbl:    { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },

  // White background + red text + border — compact, NOT full-width
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#fca5a5',
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 24,
    alignSelf: 'flex-start',   // compact — only as wide as content
    marginTop: 4,
  },
  signOutTxt: { color: C.danger, fontWeight: '700', fontSize: 13 },
});
