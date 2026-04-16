'use client';

/**
 * AdminSidebar — PRD §5 管理端侧边栏
 *
 * 240px width, icon + text navigation.
 * Used for ADMIN and TRAINER roles on admin/* pages.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FolderUp,
  ClipboardCheck,
  BarChart3,
  Users,
  UsersRound,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { tenantConfig } from '../../lib/tenant-config';

const tenant = tenantConfig();

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const ADMIN_ITEMS: SidebarItem[] = [
  { href: '/courses', label: '课程管理', icon: BookOpen },
  { href: '/admin/courses', label: '文档上传', icon: FolderUp },
  { href: '/admin/review', label: 'AI 审核', icon: ClipboardCheck },
  { href: '/admin/analytics', label: '数据看板', icon: BarChart3 },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/partners', label: '代理商管理', icon: UsersRound },
];

const TRAINER_ITEMS: SidebarItem[] = [
  { href: '/courses/agency', label: '课程管理', icon: BookOpen },
  { href: '/admin/analytics', label: '学员统计', icon: BarChart3 },
];

export default function AdminSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const items = user.role === 'ADMIN' ? ADMIN_ITEMS : TRAINER_ITEMS;

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-base-200 bg-white">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-base-200 px-5">
        <span className="text-sm font-semibold text-base-900">
          {tenant.adminTitle}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-base-600 hover:text-base-900 hover:bg-base-100'
                  }`}
                >
                  <item.icon size={18} strokeWidth={1.5} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-base-200 px-3 py-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-base-400 transition hover:text-base-900 hover:bg-base-100"
        >
          <Settings size={18} strokeWidth={1.5} />
          设置
        </Link>
      </div>
    </aside>
  );
}
