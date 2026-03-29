'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>JP</span>
        </div>
        <h1 style={styles.title}>JobPortal Admin</h1>
        <p style={styles.sub}>Sign in to manage the platform</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            style={styles.input} type="text" placeholder="Username"
            value={username} onChange={e => setUsername(e.target.value)} required
          />
          <input
            style={styles.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
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
