/**
 * verify-email.tsx
 *
 * Reached after registration OR from AuthGuard when email_verified=false.
 *
 * Does NOT require authentication — identified by email (route param or
 * AuthContext). Backend endpoints are AllowAny.
 *
 * Flow:
 *   1. Screen receives email via route param (from registration) or AuthContext
 *   2. OTP was already sent by RegisterView — user just enters it
 *   3. POST /auth/verify-otp/ { email, otp }
 *   4. On success → user logs in via /api/token/ → navigated to tabs
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { sendVerificationOTP, verifyEmailOTP } from '../../services/api';
import { getItem, saveItem, removeItem } from '../../utils/storage';
import { C } from '../../constants/theme';

function firstParam(v?: string | string[]) {
  if (Array.isArray(v)) return (v[0] || '').trim();
  return (v || '').trim();
}

export default function VerifyEmailScreen() {
  const router                        = useRouter();
  const params                        = useLocalSearchParams<{ email?: string | string[]; sent?: string | string[] }>();
  const { user, markEmailVerified } = useAuth();

  const [email, setEmail]         = useState(() =>
    firstParam(params.email).toLowerCase() || (user?.email || '').trim().toLowerCase()
  );
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [countdown, setCountdown] = useState(() => firstParam(params.sent) === '1' ? 60 : 0);

  // Recover email from route / session / storage — Expo web often drops params.
  useEffect(() => {
    const fromParams = firstParam(params.email).toLowerCase();
    if (fromParams) {
      setEmail(fromParams);
      saveItem('pending_verify_email', fromParams);
      return;
    }
    if (user?.email) {
      const fromUser = user.email.trim().toLowerCase();
      setEmail(fromUser);
      saveItem('pending_verify_email', fromUser);
      return;
    }
    getItem('pending_verify_email').then(stored => {
      if (stored?.trim()) setEmail(stored.trim().toLowerCase());
    });
  }, [params.email, user?.email]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOtp = async (overrideEmail?: string) => {
    const to = (overrideEmail || email).trim().toLowerCase();
    if (!to) {
      setError('Enter the email you registered with, then tap Resend OTP.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await saveItem('pending_verify_email', to);
      await sendVerificationOTP(to);
      setSuccess(`Verification code sent to ${to}`);
      setCountdown(60);
    } catch (e: any) {
      const data = e?.response?.data;
      const msg  = data?.error || data?.message || '';
      // Treat any non-error response (200/503 with message) as informational
      if (e?.response?.status === 200 || msg.toLowerCase().includes('already sent') ||
          msg.toLowerCase().includes('wait') || msg.toLowerCase().includes('check your inbox')) {
        setSuccess(msg || `Code already sent to ${to}. Check your inbox.`);
        setCountdown(60);
      } else if (e?.response?.status === 503) {
        // Backend couldn't send — show error but don't block UI
        setError('Email service temporarily unavailable. Please try again in a moment.');
      } else {
        setError(msg || 'Failed to send code. Please try again.');
      }
    }
    setSending(false);
  };

  const handleVerify = async () => {
    const to = email.trim().toLowerCase();
    if (!to) {
      setError('Enter the email you registered with, then tap Verify Email.');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmailOTP(to, otp);
      await removeItem('pending_verify_email');

      // Email verified — now log in if we have credentials in context,
      // or if user is already authenticated, just update the flag.
      if (user) {
        // Already have a session — just mark verified and let AuthGuard route
        markEmailVerified();
      } else {
        // Came from registration — we don't have a token yet.
        // Show success and navigate to login so user can sign in.
        setSuccess('Email verified! Please sign in to continue.');
        setTimeout(() => router.replace('/(auth)/login'), 1500);
        setLoading(false);
        return;
      }
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.error || d?.detail || 'Invalid or expired code. Please try again.');
      setLoading(false);
    }
    // Don't setLoading(false) on success path — AuthGuard navigates away
  };

  const displayEmail = email.trim() || '…';

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>

          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={28} color={C.primary} />
          </View>

          <Text style={s.title}>Verify Your Email</Text>
          <Text style={s.sub}>
            We sent a 6-digit code to{'\n'}
            <Text style={s.emailText}>{displayEmail}</Text>
            {'\n\n'}
            {user?.role === 'employer'
              ? 'After verifying, your documents will be reviewed by our team.'
              : 'Enter the code below to activate your account.'}
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

          {!email.trim() ? (
            <View style={s.otpWrap}>
              <Ionicons name="mail-outline" size={16} color={C.textSub} style={{ marginRight: 8 }} />
              <TextInput
                style={[s.otpInput, { letterSpacing: 0, fontSize: 15, fontWeight: '500', textAlign: 'left' }]}
                value={email}
                onChangeText={v => { setEmail(v.trim().toLowerCase()); setError(''); }}
                placeholder="Email you registered with"
                placeholderTextColor={C.textSub}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : null}

          {/* OTP input */}
          <View style={s.otpWrap}>
            <Ionicons name="keypad-outline" size={16} color={C.textSub} style={{ marginRight: 8 }} />
            <TextInput
              style={s.otpInput}
              value={otp}
              onChangeText={v => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="Enter 6-digit code"
              placeholderTextColor={C.textSub}
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
              autoFocus
            />
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[s.btn, (loading || otp.length !== 6) && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>Verify Email</Text>
            }
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={[s.resendBtn, (sending || countdown > 0) && { opacity: 0.5 }]}
            onPress={() => sendOtp()}
            disabled={sending || countdown > 0}
          >
            {sending
              ? <ActivityIndicator color={C.primary} size="small" />
              : <Text style={s.resendText}>
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </Text>
            }
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={s.backText}>← Back to Sign In</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 380, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 6,
  },
  iconWrap:    {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title:       { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 6 },
  sub:         { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  emailText:   { fontWeight: '700', color: C.text, fontSize: 13 },

  errorBox:    {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fee2e2', borderRadius: 9, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#fecaca', width: '100%',
  },
  errorText:   { flex: 1, color: C.danger, fontSize: 12 },
  successBox:  {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#dcfce7', borderRadius: 9, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0', width: '100%',
  },
  successText: { flex: 1, color: '#15803d', fontSize: 12 },

  otpWrap:     {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.primary,
    paddingHorizontal: 12, width: '100%', marginBottom: 14,
  },
  otpInput:    {
    flex: 1, paddingVertical: 12, fontSize: 20,
    fontWeight: '700', color: C.text, letterSpacing: 6,
  },

  btn:         {
    backgroundColor: C.primary, borderRadius: 11, padding: 13,
    alignItems: 'center', width: '100%', marginBottom: 10,
  },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  resendBtn:   { paddingVertical: 8, marginBottom: 6 },
  resendText:  { color: C.primary, fontSize: 13, fontWeight: '600' },

  backBtn:     { paddingVertical: 6 },
  backText:    { color: C.textSub, fontSize: 12 },
});
