'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/* ─── tiny reusable pieces ─────────────────────────────────── */

function FieldInput({
  type = 'text', placeholder, value, onChange, icon,
}: {
  type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon: React.ReactNode;
}) {
  return (
    <div style={s.inputWrap}>
      <span style={s.inputIcon}>{icon}</span>
      <input
        style={s.input}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      />
    </div>
  );
}

function PrimaryBtn({ children, disabled, type = 'submit' }: {
  children: React.ReactNode; disabled?: boolean; type?: 'submit' | 'button';
}) {
  return (
    <button style={{ ...s.btn, opacity: disabled ? 0.7 : 1 }} type={type} disabled={disabled}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" style={s.ghostBtn} onClick={onClick}>{children}</button>
  );
}

function Alert({ type, msg }: { type: 'error' | 'success'; msg: string }) {
  return (
    <div style={type === 'error' ? s.alertError : s.alertSuccess}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
        {type === 'error'
          ? <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
          : <><polyline points="20 6 9 17 4 12"/></>
        }
      </svg>
      {msg}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();

  /* Login */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  /* Reset flow */
  const [showReset, setShowReset]   = useState(false);
  const [resetStep, setResetStep]   = useState<'email' | 'otp'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp]     = useState('');
  const [resetNewPass, setResetNewPass]       = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetMsg, setResetMsg]   = useState('');
  const [resetErr, setResetErr]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_token')) router.replace('/dashboard');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(''); setLoginLoading(true);
    try {
      const res = await adminLogin({ username, password });
      localStorage.setItem('admin_token', res.data.access);
      router.replace('/dashboard');
    } catch {
      setLoginErr('Invalid credentials or not an admin account.');
    }
    setLoginLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(''); setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResetErr(data.error || `Server error (${res.status}).`);
        setResetLoading(false); return;
      }
      setResetMsg(`OTP sent to ${resetEmail}`);
      setResetStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setResetErr('Cannot reach the server. Check NEXT_PUBLIC_API_URL.');
      } else {
        setResetErr('Failed to send OTP.');
      }
    }
    setResetLoading(false);
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr('');
    if (resetNewPass.length < 8) { setResetErr('Password must be at least 8 characters.'); return; }
    if (resetNewPass !== resetConfirmPass) { setResetErr('Passwords do not match.'); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, new_password: resetNewPass }),
      });
      const data = await res.json();
      if (!res.ok) { setResetErr(data.error || 'Failed.'); setResetLoading(false); return; }
      setResetMsg('Password reset successfully! You can now sign in.');
      setTimeout(() => { setShowReset(false); setResetStep('email'); setResetMsg(''); }, 2500);
    } catch { setResetErr('Failed to reset password.'); }
    setResetLoading(false);
  };

  const resendOtp = async () => {
    setResetMsg(''); setResetErr('');
    try {
      await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetMsg(`New OTP sent to ${resetEmail}`);
    } catch { setResetErr('Failed to resend OTP.'); }
  };

  const openReset = () => {
    setShowReset(true); setResetStep('email');
    setResetMsg(''); setResetErr('');
    setResetEmail(''); setResetOtp(''); setResetNewPass(''); setResetConfirmPass('');
  };

  /* ── icons ── */
  const iconUser = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
  const iconLock = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
  const iconMail = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
  const iconKey = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
  const iconHash = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
        </div>
        <h1 style={s.title}>JobPortal Admin</h1>
        <p style={s.sub}>
          {showReset
            ? resetStep === 'email' ? 'Enter your email to reset your password' : 'Enter the OTP and your new password'
            : 'Sign in to manage the platform'}
        </p>

        {/* ── Login form ── */}
        {!showReset && (
          <form onSubmit={handleLogin} style={s.form}>
            <FieldInput placeholder="Username" value={username} onChange={setUsername} icon={iconUser} />
            <FieldInput type="password" placeholder="Password" value={password} onChange={setPassword} icon={iconLock} />
            {loginErr && <Alert type="error" msg={loginErr} />}
            <PrimaryBtn disabled={loginLoading}>{loginLoading ? 'Signing in…' : 'Sign In'}</PrimaryBtn>
            <GhostBtn onClick={openReset}>Forgot your password?</GhostBtn>
          </form>
        )}

        {/* ── Reset form — email step ── */}
        {showReset && resetStep === 'email' && (
          <form onSubmit={handleResetRequest} style={s.form}>
            <FieldInput type="email" placeholder="Your email address" value={resetEmail} onChange={setResetEmail} icon={iconMail} />
            {resetMsg && <Alert type="success" msg={resetMsg} />}
            {resetErr && <Alert type="error" msg={resetErr} />}
            <PrimaryBtn disabled={resetLoading}>{resetLoading ? 'Sending…' : 'Send OTP'}</PrimaryBtn>
            <GhostBtn onClick={() => setShowReset(false)}>← Back to Sign In</GhostBtn>
          </form>
        )}

        {/* ── Reset form — OTP step ── */}
        {showReset && resetStep === 'otp' && (
          <form onSubmit={handleResetConfirm} style={s.form}>
            <FieldInput placeholder="6-digit OTP" value={resetOtp}
              onChange={v => setResetOtp(v.replace(/\D/g, '').slice(0, 6))} icon={iconHash} />
            <FieldInput type="password" placeholder="New password (min 8 chars)" value={resetNewPass} onChange={setResetNewPass} icon={iconKey} />
            <FieldInput type="password" placeholder="Confirm new password" value={resetConfirmPass} onChange={setResetConfirmPass} icon={iconLock} />
            {resetMsg && <Alert type="success" msg={resetMsg} />}
            {resetErr && <Alert type="error" msg={resetErr} />}
            <PrimaryBtn disabled={resetLoading}>{resetLoading ? 'Resetting…' : 'Reset Password'}</PrimaryBtn>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostBtn onClick={resendOtp}>Resend OTP</GhostBtn>
              <GhostBtn onClick={() => setShowReset(false)}>← Back to Sign In</GhostBtn>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)',
    padding: '24px 16px',
  },

  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    padding: '44px 40px 36px',
    width: '100%', maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    textAlign: 'center',
  },

  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  logoIcon: {
    width: 56, height: 56,
    borderRadius: 'var(--radius-xl)',
    background: 'var(--primary-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(108,99,255,0.2)',
  },

  title: {
    fontSize: 22, fontWeight: 800,
    color: 'var(--text)',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14, color: 'var(--text-sub)',
    marginBottom: 28, lineHeight: 1.5,
  },

  form: {
    display: 'flex', flexDirection: 'column', gap: 12,
    textAlign: 'left',
  },

  inputWrap: {
    position: 'relative',
    display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 14,
    color: 'var(--text-muted)',
    display: 'flex', alignItems: 'center',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    paddingTop: 12, paddingBottom: 12,
    paddingLeft: 42, paddingRight: 14,
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)',
    fontSize: 14, fontWeight: 500,
    color: 'var(--text)',
    background: 'var(--bg)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },

  btn: {
    width: '100%',
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--primary)',
    color: '#fff',
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    marginTop: 4,
  },

  ghostBtn: {
    background: 'none', border: 'none',
    color: 'var(--primary)',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center',
  },

  alertError: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--danger-light)',
    border: '1px solid #fca5a5',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 13, fontWeight: 500,
    color: '#b91c1c',
  },
  alertSuccess: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 13, fontWeight: 500,
    color: '#15803d',
  },
};
