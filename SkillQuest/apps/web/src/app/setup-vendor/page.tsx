'use client';

/**
 * Setup Vendor Page — PRD §4.2
 *
 * First-time deployment bootstrap.
 * Requires BOOTSTRAP_TOKEN to create the initial ADMIN account.
 */

import React, { useState, type FormEvent } from 'react';
import { Shield, Key, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { tenantConfig } from '../../lib/tenant-config';

const tenant = tenantConfig();
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function SetupVendorPage() {
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!bootstrapToken.trim()) {
        throw new Error('请输入引导令牌 (BOOTSTRAP_TOKEN)');
      }

      if (API_URL) {
        const res = await fetch(`${API_URL}/setup-vendor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bootstrap-Token': bootstrapToken,
          },
          body: JSON.stringify({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as Record<string, string> | null)?.message ?? '初始化失败',
          );
        }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败，请检查引导令牌');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-base-900">平台初始化完成</h1>
          <p className="mt-2 text-sm text-base-400">
            管理员账号已创建，请使用该账号登录系统。
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700"
          >
            前往登录
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Shield size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-900">
            平台初始化
          </h1>
          <p className="mt-2 text-sm text-base-400">
            {tenant.companyName} · 首次部署配置
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bootstrap Token */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-base-600">
              引导令牌 (BOOTSTRAP_TOKEN)
            </label>
            <div className="relative">
              <Key
                size={16}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
              />
              <input
                type="password"
                placeholder="输入部署时提供的引导令牌"
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                required
                className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="h-px bg-base-200" />

          {/* Admin Name */}
          <div className="relative">
            <User
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="text"
              placeholder="管理员姓名"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Admin Email */}
          <div className="relative">
            <Mail
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="email"
              placeholder="管理员邮箱"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-base-200 bg-white py-2.5 pl-10 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Admin Password */}
          <div className="relative">
            <Lock
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
            />
            <input
              type="password"
              placeholder="管理员密码"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
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
              <Shield size={16} strokeWidth={1.5} />
            )}
            <span>{submitting ? '初始化中...' : '创建管理员并初始化'}</span>
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-base-400">{tenant.copyright}</p>
      </div>
    </main>
  );
}
