import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { UsageSummary, UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  usage: UsageSummary | null;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  usage: null,
  refreshUser: async () => {},
  refreshUsage: async () => {},
  setUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const refreshUsage = useCallback(async () => {
    try {
      const data = await apiFetch<UsageSummary>('/api/usage');
      setUsage(data);
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
      setUser(data.user);
      if (data.user) {
        await refreshUsage();
      } else {
        setUsage(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUsage]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setUsage(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, usage, refreshUser, refreshUsage, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
