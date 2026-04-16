'use client';

/**
 * Admin Users Page — PRD §4.2
 *
 * Manage users: activate PENDING registrations, view all users.
 * Admin can change status from PENDING → ACTIVE or DISABLED.
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  UserCheck,
} from 'lucide-react';
import Navbar from '../../../components/layout/Navbar';
import AdminSidebar from '../../../components/layout/AdminSidebar';

type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
type UserRole = 'ADMIN' | 'TRAINER' | 'LEARNER';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string;
}

// Mock user data
const MOCK_USERS: ManagedUser[] = [
  { id: 'u1', name: '张三', email: 'zhangsan@example.com', role: 'LEARNER', status: 'PENDING', registeredAt: '2026-04-15T10:00:00Z' },
  { id: 'u2', name: '李四', email: 'lisi@example.com', role: 'LEARNER', status: 'PENDING', registeredAt: '2026-04-14T08:30:00Z' },
  { id: 'u3', name: '王五', email: 'wangwu@example.com', role: 'LEARNER', status: 'ACTIVE', registeredAt: '2026-04-10T14:00:00Z' },
  { id: 'u4', name: '赵六', email: 'zhaoliu@example.com', role: 'TRAINER', status: 'ACTIVE', registeredAt: '2026-04-08T09:00:00Z' },
  { id: 'u5', name: '钱七', email: 'qianqi@example.com', role: 'LEARNER', status: 'DISABLED', registeredAt: '2026-04-05T16:00:00Z' },
  { id: 'u6', name: '孙八', email: 'sunba@example.com', role: 'LEARNER', status: 'ACTIVE', registeredAt: '2026-04-12T11:00:00Z' },
  { id: 'u7', name: '周九', email: 'zhoujiu@example.com', role: 'LEARNER', status: 'PENDING', registeredAt: '2026-04-16T07:00:00Z' },
];

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: React.ElementType; cls: string }> = {
  PENDING: { label: '待审核', icon: Clock, cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  ACTIVE: { label: '已激活', icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  DISABLED: { label: '已禁用', icon: XCircle, cls: 'text-red-600 bg-red-50 border-red-200' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '管理员',
  TRAINER: '培训师',
  LEARNER: '学员',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  function handleActivate(userId: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'ACTIVE' as UserStatus } : u)),
    );
  }

  function handleDisable(userId: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'DISABLED' as UserStatus } : u)),
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 px-6 py-8 max-w-[1280px]">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-base-900 flex items-center gap-2">
                <Users size={20} strokeWidth={1.5} />
                用户管理
              </h1>
              <p className="mt-1 text-sm text-base-400">
                管理学员注册审核与账号状态
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-600">
                <Clock size={13} strokeWidth={1.5} />
                {pendingCount} 待审核
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
              />
              <input
                type="text"
                placeholder="搜索姓名或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-base-200 bg-white py-2 pl-9 pr-4 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div className="flex gap-1.5">
              {(['ALL', 'PENDING', 'ACTIVE', 'DISABLED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    statusFilter === s
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-base-400 hover:text-base-900 hover:bg-base-100'
                  }`}
                >
                  {s === 'ALL' ? '全部' : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          <div className="rounded-card border border-base-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-200 text-left text-xs text-base-400 bg-base-50">
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">注册时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const statusCfg = STATUS_CONFIG[u.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={u.id} className="border-b border-base-100 hover:bg-base-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-base-900">{u.name}</p>
                        <p className="text-xs text-base-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-base-600">
                          <Shield size={12} strokeWidth={1.5} />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.cls}`}>
                          <StatusIcon size={12} strokeWidth={1.5} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-base-400">
                        {new Date(u.registeredAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleActivate(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100"
                            >
                              <UserCheck size={12} strokeWidth={1.5} />
                              激活
                            </button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleDisable(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                            >
                              <XCircle size={12} strokeWidth={1.5} />
                              禁用
                            </button>
                          )}
                          {u.status === 'DISABLED' && (
                            <button
                              type="button"
                              onClick={() => handleActivate(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-base-100 border border-base-200 px-2.5 py-1 text-xs font-medium text-base-600 transition hover:bg-base-200"
                            >
                              <CheckCircle2 size={12} strokeWidth={1.5} />
                              重新激活
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-base-400">
                      没有找到匹配的用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
