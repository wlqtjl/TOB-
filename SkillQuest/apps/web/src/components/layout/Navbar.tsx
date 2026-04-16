'use client';

/**
 * Navbar — PRD §5 公共头部
 *
 * Left: Logo (dynamic)
 * Center: Role-specific navigation items
 * Right: XP counter, notifications, user profile
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Map,
  Trophy,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  Users,
  FolderUp,
  User,
  Bell,
  Zap,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuth, type UserRole } from '../../lib/auth-context';
import { tenantConfig } from '../../lib/tenant-config';

const tenant = tenantConfig();

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: '/courses', label: '课程管理', icon: BookOpen },
    { href: '/admin/courses', label: '文档上传', icon: FolderUp },
    { href: '/admin/review', label: '审核中心', icon: ClipboardCheck },
    { href: '/admin/analytics', label: '数据看板', icon: BarChart3 },
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/partners', label: '代理商管理', icon: Users },
  ],
  TRAINER: [
    { href: '/courses/agency', label: '课程管理', icon: BookOpen },
    { href: '/admin/analytics', label: '学员统计', icon: BarChart3 },
    { href: '/leaderboard', label: '排行榜', icon: Trophy },
  ],
  LEARNER: [
    { href: '/dashboard', label: '首页', icon: Home },
    { href: '/map', label: '闯关地图', icon: Map },
    { href: '/leaderboard', label: '排行榜', icon: Trophy },
    { href: '/achievements', label: '成就', icon: Trophy },
  ],
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated || !user) return null;

  const navItems = NAV_ITEMS[user.role] ?? NAV_ITEMS.LEARNER;

  // Mock XP for display
  const xpCount = 2450;

  return (
    <header className="sticky top-0 z-50 border-b border-base-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        {/* Left: Logo */}
        <Link href={user.role === 'LEARNER' ? '/dashboard' : '/courses'} className="flex items-center gap-2">
          {tenant.logoUrl ? (
            <Image src={tenant.logoUrl} alt={tenant.companyName} width={112} height={28} className="h-7 w-auto" />
          ) : (
            <span className="text-base font-semibold text-base-900">
              {tenant.platformName}
            </span>
          )}
        </Link>

        {/* Center: Role navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-base-500 hover:text-base-900 hover:bg-base-100'
                }`}
              >
                <item.icon size={15} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: XP, notifications, profile */}
        <div className="flex items-center gap-4">
          {/* XP Counter — learner only */}
          {user.role === 'LEARNER' && (
            <div className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              <Zap size={13} strokeWidth={1.5} />
              {xpCount.toLocaleString()} XP
            </div>
          )}

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg p-1.5 text-base-400 transition hover:text-base-900 hover:bg-base-100"
            aria-label="通知"
          >
            <Bell size={18} strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-danger" />
          </button>

          {/* Profile */}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-base-600 transition hover:text-base-900 hover:bg-base-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
              <User size={14} strokeWidth={1.5} />
            </div>
            <span className="hidden sm:inline text-xs">{user.displayName ?? user.email}</span>
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-1.5 text-base-400 transition hover:text-red-600 hover:bg-red-50"
            aria-label="退出登录"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
