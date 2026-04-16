'use client';

/**
 * Register Page — PRD §4.2
 *
 * Learner self-registration. After submit, status = PENDING.
 * Admin must activate from /admin/users.
 */

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { tenantConfig } from '../../lib/tenant-config';

const tenant = tenantConfig();
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (API_URL) {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as Record<string, string> | null)?.message ?? '注册失败，请稍后重试',
          );
        }
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-base-900">注册成功</h1>
          <p className="mt-2 text-sm text-base-400">
            您的账号正在等待管理员审核激活，请耐心等待。
          </p>
          <p className="mt-1 text-xs text-base-400">
            状态：<span className="font-medium text-amber-600">待审核 (PENDING)</span>
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700"
          >
            返回登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-base-900">
            注册学员账号
          </h1>
          <p className="mt-2 text-sm text-base-400">{tenant.platformName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="relative">
            <User
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="text"
              placeholder="姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
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
              <UserPlus size={16} strokeWidth={1.5} />
            )}
            <span>{submitting ? '提交中...' : '注册'}</span>
          </button>
        </form>

        {/* Back to login */}
        <p className="mt-6 text-center text-sm text-base-400">
          已有账号？{' '}
          <Link href="/login" className="text-accent hover:underline">
            返回登录
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-base-400">{tenant.copyright}</p>
      </div>
    </main>
  );
}
