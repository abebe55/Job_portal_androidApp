import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { C } from '../../constants/theme';

export default function LoginScreen() {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const { login }                 = useAuth();
  const router                    = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)/');
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        'Invalid username or password.';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Ionicons name="briefcase" size={32} color={C.primary} />
          </View>
          <Text style={styles.title}>JobPortal</Text>
          <Text style={styles.sub}>Sign in to your account</Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={C.textSub} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={v => { setUsername(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.textSub}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={C.textSub} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
              secureTextEntry={!showPass}
              placeholderTextColor={C.textSub}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>{"Don't have an account? "}</Text>
            <Text style={styles.linkBold}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    alignItems: 'center',
  },
  logoWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  title:      { fontSize: 24, fontWeight: '800', color: C.primary, marginBottom: 6 },
  sub:        { color: C.textSub, fontSize: 14, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#fecaca', width: '100%',
  },
  errorText:  { flex: 1, color: C.danger, fontSize: 13, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12, paddingHorizontal: 14,
    width: '100%',
  },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, paddingVertical: 13, fontSize: 15, color: C.text },
  eyeBtn:     { padding: 4 },
  btn:        { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4, width: '100%' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  linkText:   { color: C.textSub, fontSize: 14 },
  linkBold:   { color: C.primary, fontSize: 14, fontWeight: '700' },
});
