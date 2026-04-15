'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: 'user' | 'admin' | 'master';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (accessToken: string, refreshToken?: string, userId?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (accessToken: string, refreshToken?: string, userId?: string) => {
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    setToken(accessToken);
    try {
      const fetchedUser = await api.get<User>('/auth/me', accessToken);
      setUser(fetchedUser);
      // userId를 /auth/me 응답에서도 얻을 수 있음 (전달받은 값 우선)
      const uid = userId ?? fetchedUser.id;
      localStorage.setItem('user_id', uid);
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // 앱 시작 시 저장된 토큰으로 자동 로그인
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRefresh = localStorage.getItem('refresh_token') ?? undefined;
    const storedUserId = localStorage.getItem('user_id') ?? undefined;
    if (storedToken) {
      login(storedToken, storedRefresh, storedUserId).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [login]);

  // api.ts에서 발생하는 auth:expired 이벤트 수신 → 상태 정리
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
