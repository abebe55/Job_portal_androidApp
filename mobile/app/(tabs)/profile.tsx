import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { C } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isAmharic, setIsAmharic] = useState(i18n.language === 'am');

  const toggleLanguage = (val: boolean) => {
    setIsAmharic(val);
    i18n.changeLanguage(val ? 'am' : 'en');
  };

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const employerItems = [
    { icon: 'wallet-outline', label: t('myWallet'), path: '/wallet', color: '#16a34a' },
    { icon: 'add-circle-outline', label: t('postJob'), path: '/post-job', color: C.primary },
    { icon: 'list-outline', label: t('myPostedJobs'), path: '/my-jobs', color: C.primary },
  ];

  const commonItems = [
    { icon: 'document-text-outline', label: t('myCV'), path: '/(tabs)/cv', color: C.primary },
    { icon: 'checkmark-circle-outline', label: t('myApplications'), path: '/(tabs)/applications', color: C.primary },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 60 }}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {user?.role === 'employer' ? t('roleBadgeEmployer') : t('roleBadgeSeeker')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('language')}</Text>
        <View style={styles.langRow}>
          <Text style={[styles.langLabel, !isAmharic && styles.langActive]}>English</Text>
          <Switch
            value={isAmharic}
            onValueChange={toggleLanguage}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor={C.white}
          />
          <Text style={[styles.langLabel, isAmharic && styles.langActive]}>አማርኛ</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('menu')}</Text>
        {user?.role === 'employer' && employerItems.map(item => (
          <TouchableOpacity key={item.path} style={styles.menuItem} onPress={() => router.push(item.path as any)}>
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.border} />
          </TouchableOpacity>
        ))}
        {commonItems.map(item => (
          <TouchableOpacity key={item.path} style={styles.menuItem} onPress={() => router.push(item.path as any)}>
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.border} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={C.danger} />
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8f8ff' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, marginHorizontal: 0, marginTop: 14,
    borderRadius: 14, padding: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: C.primary },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  email: { fontSize: 12, color: C.textSub, marginTop: 1 },
  roleBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  roleBadgeText: { color: C.primary, fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: C.white, borderRadius: 14,
    marginHorizontal: 0, marginTop: 14,
    padding: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.07)',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  langLabel: { fontSize: 14, color: C.textSub, fontWeight: '700' },
  langActive: { color: C.primary, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 0, marginTop: 14,
    backgroundColor: '#fee2e2', borderRadius: 12, padding: 14,
  },
  signOutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
});
