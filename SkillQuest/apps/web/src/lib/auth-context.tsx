'use client';

/**
 * Auth Context — JWT authentication state management
 *
 * Stores token + user in localStorage, validates on mount via /auth/me,
 * and provides login/logout/role helpers to the entire app.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'TRAINER' | 'LEARNER';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  tenantId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_TOKEN_KEY = 'sq_token';
const STORAGE_USER_KEY = 'sq_user';

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Role Mapping ────────────────────────────────────────────────────

function normalizeRole(raw: string): UserRole {
  const lower = raw.toLowerCase();
  if (lower === 'vendor_admin' || lower === 'admin') return 'ADMIN';
  if (lower === 'partner_boss' || lower === 'trainer') return 'TRAINER';
  return 'LEARNER';
}

// ─── JWT Decode (no library) ─────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromJwt(token: string): Partial<AuthUser> | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: payload.sub as string,
    email: payload.email as string,
    role: normalizeRole((payload.role as string) ?? 'learner'),
    tenantId: payload.tenantId as string,
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function apiLogin(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as Record<string, string> | null)?.message ?? '登录失败，请检查邮箱和密码',
    );
  }
  const data = await res.json();
  const jwtInfo = userFromJwt(data.token);
  const user: AuthUser = {
    id: data.user?.id ?? jwtInfo?.id ?? '',
    email: data.user?.email ?? jwtInfo?.email ?? email,
    displayName: data.user?.displayName,
    role: normalizeRole(data.user?.role ?? jwtInfo?.role ?? 'learner'),
    tenantId: data.user?.tenantId ?? jwtInfo?.tenantId ?? '',
  };
  return { user, token: data.token };
}

async function apiGetMe(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id ?? data.sub ?? '',
      email: data.email ?? '',
      displayName: data.displayName,
      role: normalizeRole(data.role ?? 'learner'),
      tenantId: data.tenantId ?? '',
    };
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
        const storedUser = localStorage.getItem(STORAGE_USER_KEY);

        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        // Optimistically restore cached user while we validate
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch { /* ignore corrupt data */ }
        }

        setToken(storedToken);

        // Validate token with backend if API is configured
        if (API_URL) {
          const freshUser = await apiGetMe(storedToken);
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(freshUser));
          } else {
            // Token expired or invalid — clear state
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            localStorage.removeItem(STORAGE_USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    hydrate();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!API_URL) {
        throw new Error('API 未配置，请使用演示登录');
      }
      const result = await apiLogin(email, password);
      localStorage.setItem(STORAGE_TOKEN_KEY, result.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within an <AuthProvider>');
  }
  return ctx;
}

// ─── Demo Login Helper ───────────────────────────────────────────────

export function setDemoAuth(role: UserRole = 'LEARNER'): AuthUser {
  const demoUser: AuthUser = {
    id: 'demo-user-001',
    email: 'demo@skillquest.dev',
    displayName: '演示用户',
    role,
    tenantId: 'demo-tenant',
  };
  const demoToken = 'demo-token-not-a-real-jwt';
  localStorage.setItem(STORAGE_TOKEN_KEY, demoToken);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}
