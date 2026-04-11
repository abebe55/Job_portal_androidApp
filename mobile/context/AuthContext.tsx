import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveItem, getItem, removeItem } from '../utils/storage';
import { login as loginApi, getProfile } from '../services/api';

type User = {
  id: number;
  username: string;
  email: string;
  role: 'jobseeker' | 'employer';
  phone: string;
  location: string;
  preferred_language: string;
  is_approved: boolean;
  email_verified: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  markEmailVerified: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const stored = await getItem('access_token');
        if (stored) {
          setToken(stored);
          const res = await getProfile();
          setUser(res.data);
        }
      } catch {
        await removeItem('access_token');
      } finally {
        setLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await loginApi({ username, password });
    const { access, refresh } = res.data;
    await saveItem('access_token', access);
    await saveItem('refresh_token', refresh);
    setToken(access);
    const profile = await getProfile();
    setUser(profile.data);
  };

  const refreshUser = async () => {
    const profile = await getProfile();
    // Merge with existing user to preserve locally-set fields like email_verified
    // that may not yet be reflected on the server
    setUser(prev => prev ? { ...prev, ...profile.data } : profile.data);
  };

  const markEmailVerified = () => {
    setUser(prev => prev ? { ...prev, email_verified: true } : prev);
  };

  const logout = async () => {
    await removeItem('access_token');
    await removeItem('refresh_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser, markEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
