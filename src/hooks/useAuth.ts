import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { AuthUser } from '@/types';

let cachedUser: AuthUser | null = null;
let authChecked = false;
let authPromise: Promise<AuthUser | null> | null = null;

async function loadUser(): Promise<AuthUser | null> {
  const token =
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token');

  if (!token) {
    cachedUser = null;
    authChecked = true;
    return null;
  }

  try {
    const me = await api.me();
    cachedUser = me;
    authChecked = true;
    return me;
  } catch {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');

    cachedUser = null;
    authChecked = true;

    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(!authChecked);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    if (authChecked) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!authPromise) {
      authPromise = loadUser().finally(() => {
        authPromise = null;
      });
    }

    const result = await authPromise;

    setUser(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();

    const handler = () => {
      cachedUser = null;
      authChecked = true;

      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');

      setUser(null);
      setLoading(false);
    };

    window.addEventListener('auth-expired', handler);

    return () => {
      window.removeEventListener('auth-expired', handler);
    };
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      setAuthError(null);

      try {
        const data = await api.login(email, password, remember);

        cachedUser = data.user;
        authChecked = true;

        setUser(data.user);

        return data.user;
      } catch (e) {
        setAuthError(
          e instanceof Error ? e.message : 'Login failed'
        );
        throw e;
      }
    },
    []
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthError(null);

      try {
        const data = await api.signup(name, email, password);

        cachedUser = data.user;
        authChecked = true;

        setUser(data.user);

        return data.user;
      } catch (e) {
        setAuthError(
          e instanceof Error ? e.message : 'Signup failed'
        );
        throw e;
      }
    },
    []
  );

  const logout = useCallback(() => {
    api.logout();

    cachedUser = null;
    authChecked = true;

    setUser(null);
  }, []);

  return {
    user,
    loading,
    authError,
    login,
    signup,
    logout,
  };
}