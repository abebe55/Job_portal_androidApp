import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { C } from '../../constants/theme';

export default function VerifyEmailScreen() {
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail]         = useState('');
  const { user, markEmailVerified } = useAuth();
  const hasSentRef                = useRef(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  // Send OTP once on mount — ref survives StrictMode within same instance
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    sendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOtp = async () => {
    setSending(true);
    setError('');
    try {
      await api.post('/auth/send-otp/');
      const sentEmail = user?.email || email;
      setSuccess(sentEmail ? `OTP sent to ${sentEmail}` : 'OTP sent to your email');
      setCountdown(60);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to send OTP');
    }
    setSending(false);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp/', { otp });
      // Update context locally — no network call, no remount side-effects
      // AuthGuard will see email_verified=true and redirect automatically
      markEmailVerified();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Invalid or expired OTP.');
      setLoading(false);
    }
    // Don't setLoading(false) on success — let AuthGuard navigate away
  };

  const displayEmail = user?.email || email || '…';

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={28} color={C.primary} />
          </View>
          <Text style={s.title}>Verify Your Email</Text>
          <Text style={s.sub}>
            We sent a 6-digit code to{'\n'}
            <Text style={s.emailText}>{displayEmail}</Text>
            {user?.role === 'employer'
              ? '\n\nAfter verifying, your documents will be reviewed by our team.'
              : ''}
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

          <View style={s.otpWrap}>
            <Ionicons name="keypad-outline" size={16} color={C.textSub} style={{ marginRight: 8 }} />
            <TextInput
              style={s.otpInput}
              value={otp}
              onChangeText={v => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={C.textSub}
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
            />
          </View>

          <TouchableOpacity
            style={[s.btn, (loading || otp.length !== 6) && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>Verify Email</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.resendBtn, (sending || countdown > 0) && { opacity: 0.5 }]}
            onPress={sendOtp}
            disabled={sending || countdown > 0}>
            {sending
              ? <ActivityIndicator color={C.primary} size="small" />
              : <Text style={s.resendText}>
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </Text>
            }
          </TouchableOpacity>

          {user?.role !== 'employer' && (
            <TouchableOpacity style={s.skipBtn} onPress={() => markEmailVerified()}>
              <Text style={s.skipText}>Skip for now →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 6 },
  iconWrap:    { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title:       { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 6 },
  sub:         { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  emailText:   { fontWeight: '700', color: C.text, fontSize: 13 },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fee2e2', borderRadius: 9, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca', width: '100%' },
  errorText:   { flex: 1, color: C.danger, fontSize: 12 },
  successBox:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#dcfce7', borderRadius: 9, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0', width: '100%' },
  successText: { flex: 1, color: '#15803d', fontSize: 12 },
  otpWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 11, borderWidth: 1.5, borderColor: C.primary, paddingHorizontal: 12, width: '100%', marginBottom: 14 },
  otpInput:    { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: 4 },
  btn:         { backgroundColor: C.primary, borderRadius: 11, padding: 13, alignItems: 'center', width: '100%', marginBottom: 10 },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  resendBtn:   { paddingVertical: 8, marginBottom: 6 },
  resendText:  { color: C.primary, fontSize: 13, fontWeight: '600' },
  skipBtn:     { paddingVertical: 6 },
  skipText:    { color: C.textSub, fontSize: 12 },
});
