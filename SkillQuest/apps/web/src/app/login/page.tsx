'use client';

/**
 * Login Page — light minimalist design (Linear/Stripe style)
 *
 * Supports real API login and a demo mode for development.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, LogIn, AlertCircle, Zap } from 'lucide-react';
import { useAuth, setDemoAuth, type UserRole } from '../../lib/auth-context';
import { tenantConfig } from '../../lib/tenant-config';

const tenant = tenantConfig();

const ROLE_REDIRECT: Record<UserRole, string> = {
  ADMIN: '/courses',
  TRAINER: '/courses/agency',
  LEARNER: '/dashboard',
};

export default function LoginPage() {
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(ROLE_REDIRECT[user.role] ?? '/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      // login updates context; useEffect will redirect
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '登录失败，请稍后重试',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemoLogin(role: UserRole) {
    const demoUser = setDemoAuth(role);
    // Force a full reload so AuthProvider picks up the new localStorage values
    window.location.href = ROLE_REDIRECT[demoUser.role] ?? '/';
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* ── Brand ── */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-base-900">
            {tenant.platformName}
          </h1>
          <p className="mt-2 text-sm text-base-400">{tenant.tagline}</p>
        </div>

        {/* ── Login Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <Mail
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LogIn size={16} strokeWidth={1.5} />
            )}
            <span>{submitting ? '登录中...' : '登录'}</span>
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-base-200" />
          <span className="text-xs text-base-400">演示模式</span>
          <div className="h-px flex-1 bg-base-200" />
        </div>

        {/* ── Demo Login ── */}
        <div className="space-y-2.5">
          <p className="text-center text-xs text-base-400 mb-3">
            无需配置后端，快速体验平台功能
          </p>
          {(
            [
              { role: 'ADMIN', label: '管理员', desc: '数据看板 / 课程管理' },
              { role: 'TRAINER', label: '培训师', desc: '课程编辑 / 学员管理' },
              { role: 'LEARNER', label: '学员', desc: '闯关学习 / 排行榜' },
            ] as const
          ).map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => handleDemoLogin(item.role)}
              className="flex w-full items-center gap-3 rounded-lg border border-base-200 bg-white px-4 py-2.5 text-left transition hover:border-accent/40"
            >
              <Zap size={14} strokeWidth={1.5} className="shrink-0 text-accent/60" />
              <div className="flex-1">
                <span className="text-sm font-medium text-base-700">{item.label}</span>
                <span className="ml-2 text-xs text-base-400">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Footer ── */}
        <p className="mt-10 text-center text-xs text-base-400">
          {tenant.copyright}
        </p>
      </div>
    </main>
  );
}
