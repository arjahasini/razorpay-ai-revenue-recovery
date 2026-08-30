import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { AuthUser } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
      setAuthError(null);
    } catch {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const handler = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setAuthError(null);
    try {
      const data = await api.login(email, password, remember);
      setUser(data.user);
      return data.user;
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const data = await api.signup(name, email, password);
      setUser(data.user);
      return data.user;
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Signup failed');
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return { user, loading, authError, login, signup, logout };
}
