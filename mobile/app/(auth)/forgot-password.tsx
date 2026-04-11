import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { C } from '../../constants/theme';

type Step = 'email' | 'otp';

export default function ForgotPasswordScreen() {
  const [step, setStep]           = useState<Step>('email');
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const router = useRouter();

  const handleRequestOTP = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/password-reset/request/', { email: email.trim().toLowerCase() });
      setSuccess(`OTP sent to ${email}. Check your inbox.`);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    if (!newPassword.trim() || newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/password-reset/confirm/', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setSuccess('Password reset successfully!');
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Invalid or expired OTP.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <TouchableOpacity style={s.backBtn} onPress={() => step === 'otp' ? setStep('email') : router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.primary} />
          </TouchableOpacity>

          <View style={s.iconWrap}>
            <Ionicons name={step === 'email' ? 'mail-outline' : 'key-outline'} size={28} color={C.primary} />
          </View>

          <Text style={s.title}>{step === 'email' ? 'Forgot Password' : 'Reset Password'}</Text>
          <Text style={s.sub}>
            {step === 'email'
              ? 'Enter your email address and we\'ll send you a 6-digit OTP to reset your password.'
              : `Enter the OTP sent to ${email} and your new password.`
            }
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#16a34a" />
              <Text style={s.successText}>{success}</Text>
            </View>
          ) : null}

          {step === 'email' ? (
            <>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={C.textSub} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Your email address"
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={C.textSub}
                />
              </View>
              <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleRequestOTP} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.inputWrap}>
                <Ionicons name="keypad-outline" size={18} color={C.textSub} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChangeText={v => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholderTextColor={C.textSub}
                />
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textSub} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); setError(''); }}
                  secureTextEntry={!showPass}
                  placeholderTextColor={C.textSub}
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textSub} />
                </TouchableOpacity>
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textSub} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); setError(''); }}
                  secureTextEntry={!showPass}
                  placeholderTextColor={C.textSub}
                />
              </View>
              <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Reset Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12 }} onPress={handleRequestOTP} disabled={loading}>
                <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.replace('/(auth)/login')}>
            <Text style={{ color: C.textSub, fontSize: 13 }}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 6 },
  backBtn:    { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },
  iconWrap:   { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title:      { fontSize: 20, fontWeight: '800', color: C.primary, marginBottom: 6 },
  sub:        { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fee2e2', borderRadius: 9, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca', width: '100%' },
  errorText:  { flex: 1, color: C.danger, fontSize: 12 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#dcfce7', borderRadius: 9, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0', width: '100%' },
  successText:{ flex: 1, color: '#15803d', fontSize: 12 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 12, paddingHorizontal: 14, width: '100%' },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, paddingVertical: 13, fontSize: 14, color: C.text },
  btn:        { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginTop: 4 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
