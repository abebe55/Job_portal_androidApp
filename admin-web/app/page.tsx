'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<'email'|'otp'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('admin_token')) router.replace('/dashboard');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await adminLogin({ username, password });
      localStorage.setItem('admin_token', res.data.access);
      router.replace('/dashboard');
    } catch {
      setError('Invalid credentials or not an admin account.');
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(''); setResetLoading(true);
    try {
      await fetch('http://127.0.0.1:8000/api/auth/password-reset/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetMsg(`OTP sent to ${resetEmail}`);
      setResetStep('otp');
    } catch { setResetErr('Failed to send OTP.'); }
    setResetLoading(false);
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(''); 
    if (resetNewPass.length < 8) { setResetErr('Password must be at least 8 characters.'); return; }
    if (resetNewPass !== resetConfirmPass) { setResetErr('Passwords do not match.'); return; }
    setResetLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/password-reset/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, new_password: resetNewPass }),
      });
      const data = await res.json();
      if (!res.ok) { setResetErr(data.error || 'Failed.'); setResetLoading(false); return; }
      setResetMsg('Password reset! You can now log in.');
      setTimeout(() => { setShowReset(false); setResetStep('email'); setResetMsg(''); }, 2500);
    } catch { setResetErr('Failed to reset password.'); }
    setResetLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>JP</span>
        </div>
        <h1 style={styles.title}>JobPortal Admin</h1>
        <p style={styles.sub}>Sign in to manage the platform</p>

        {!showReset ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <input style={styles.input} type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
            <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" style={{ ...styles.btn, background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', marginTop: 8 }}
              onClick={() => { setShowReset(true); setResetStep('email'); setResetMsg(''); setResetErr(''); }}>
              Forgot Password?
            </button>
          </form>
        ) : (
          <div style={styles.form}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {resetStep === 'email' ? 'Reset Password' : 'Enter OTP & New Password'}
            </h3>
            {resetMsg && <p style={{ color: '#16a34a', fontSize: 13, marginBottom: 8 }}>{resetMsg}</p>}
            {resetErr && <p style={styles.error}>{resetErr}</p>}
            {resetStep === 'email' ? (
              <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input style={styles.input} type="email" placeholder="Your email address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                <button style={styles.btn} type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send OTP'}</button>
              </form>
            ) : (
              <form onSubmit={handleResetConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input style={styles.input} type="text" placeholder="6-digit OTP" value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g,'').slice(0,6))} maxLength={6} required />
                <input style={styles.input} type="password" placeholder="New password (min 8 chars)" value={resetNewPass} onChange={e => setResetNewPass(e.target.value)} required />
                <input style={styles.input} type="password" placeholder="Confirm new password" value={resetConfirmPass} onChange={e => setResetConfirmPass(e.target.value)} required />
                <button style={styles.btn} type="submit" disabled={resetLoading}>{resetLoading ? 'Resetting...' : 'Reset Password'}</button>
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, marginTop: 4 }}
                  onClick={async () => {
                    setResetMsg(''); setResetErr('');
                    try {
                      await fetch('http://127.0.0.1:8000/api/auth/password-reset/request/', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: resetEmail }),
                      });
                      setResetMsg(`New OTP sent to ${resetEmail}`);
                    } catch { setResetErr('Failed to resend OTP.'); }
                  }}>
                  Resend OTP
                </button>
              </form>
            )}
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', marginTop: 10, fontSize: 13 }}
              onClick={() => setShowReset(false)}>← Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px', width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)', textAlign: 'center',
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginBottom: 6 },
  sub: { color: 'var(--text-sub)', fontSize: 14, marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
    fontSize: 15, background: 'var(--bg)', color: 'var(--text)', outline: 'none',
  },
  error: { color: 'var(--danger)', fontSize: 13, textAlign: 'left' },
  btn: {
    background: 'var(--primary)', color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, marginTop: 4,
  },
};
