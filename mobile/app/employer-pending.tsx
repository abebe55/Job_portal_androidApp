import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';

export default function EmployerPendingScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={s.page}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.logoBox}>
          <Ionicons name="briefcase" size={22} color="#7c3aed" />
        </View>
        <Text style={s.topBarTitle}>JobPortal</Text>
      </View>

      <View style={s.content}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="time-outline" size={56} color="#d97706" />
        </View>

        <Text style={s.title}>Account Under Review</Text>
        <Text style={s.sub}>
          Welcome, <Text style={{ fontWeight: '800', color: C.primary }}>{user?.username}</Text>!
          {'\n\n'}
          Your employer account is currently being reviewed by our admin team.
          This usually takes <Text style={{ fontWeight: '700' }}>24–48 hours</Text>.
        </Text>

        {/* What happens next */}
        <View style={s.stepsCard}>
          <Text style={s.stepsTitle}>What happens next?</Text>
          {[
            { icon: 'document-text-outline', text: 'Admin reviews your submitted credentials and documents' },
            { icon: 'checkmark-circle-outline', text: 'You receive approval and your account is activated' },
            { icon: 'briefcase-outline', text: 'You can then post jobs and hire talent' },
          ].map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
              <Ionicons name={step.icon as any} size={18} color={C.primary} style={{ marginRight: 10 }} />
              <Text style={s.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={s.infoText}>
            If you believe there is a delay or have questions, please contact support with your registered email address.
          </Text>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page:       { flex: 1, backgroundColor: C.bg },
  topBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#7c3aed', padding: 16, paddingTop: 48 },
  logoBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  topBarTitle:{ fontSize: 18, fontWeight: '800', color: '#fff' },

  content:    { flex: 1, padding: 24, alignItems: 'center' },
  iconWrap:   { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginTop: 32, marginBottom: 20, borderWidth: 3, borderColor: '#fcd34d' },
  title:      { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 12 },
  sub:        { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  stepsCard:  { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)' },
  stepsTitle: { fontSize: 13, fontWeight: '800', color: C.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  stepRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum:    { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  stepNumTxt: { fontSize: 12, fontWeight: '800', color: C.primary },
  stepText:   { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },

  infoBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#93c5fd', width: '100%' },
  infoText:   { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 },
  logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
});
