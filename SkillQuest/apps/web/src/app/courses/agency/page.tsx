'use client';

/**
 * Courses Agency Page — PRD §4.1 TRAINER view
 *
 * TRAINER (代理商管理者) landing page:
 * - View assigned courses for the agency
 * - Monitor learner progress
 * - Invite learners
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Star,
  BarChart3,
  UserPlus,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import Navbar from '../../../components/layout/Navbar';
import AdminSidebar from '../../../components/layout/AdminSidebar';
import { COURSES } from '../../../lib/mock-courses';

// Mock learner data for the agency
const MOCK_LEARNERS = [
  { id: 'l1', name: '张三', xp: 1200, starsEarned: 18, passedLevels: 12, totalLevels: 30, lastActive: '2026-04-16' },
  { id: 'l2', name: '李四', xp: 980, starsEarned: 14, passedLevels: 9, totalLevels: 30, lastActive: '2026-04-15' },
  { id: 'l3', name: '王五', xp: 750, starsEarned: 10, passedLevels: 7, totalLevels: 30, lastActive: '2026-04-14' },
  { id: 'l4', name: '赵六', xp: 420, starsEarned: 6, passedLevels: 4, totalLevels: 30, lastActive: '2026-04-16' },
  { id: 'l5', name: '钱七', xp: 200, starsEarned: 2, passedLevels: 2, totalLevels: 30, lastActive: '2026-04-13' },
];

export default function CoursesAgencyPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const totalLearners = MOCK_LEARNERS.length;
  const avgCompletion = Math.round(
    MOCK_LEARNERS.reduce((s, l) => s + (l.passedLevels / l.totalLevels), 0) / totalLearners * 100,
  );
  const totalStars = MOCK_LEARNERS.reduce((s, l) => s + l.starsEarned, 0);

  function handleInvite() {
    if (inviteEmail.trim()) {
      setInviteEmail('');
      setShowInvite(false);
    }
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
              <h1 className="text-xl font-semibold text-base-900">课程管理</h1>
              <p className="mt-1 text-sm text-base-400">管理本代理商的课程与学员</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-700"
            >
              <UserPlus size={15} strokeWidth={1.5} />
              邀请学员
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: '学员数', value: totalLearners, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: '平均完成率', value: `${avgCompletion}%`, icon: BarChart3, color: 'text-emerald-600 bg-emerald-50' },
              { label: '总获得星数', value: totalStars, icon: Star, color: 'text-amber-600 bg-amber-50' },
            ].map((s) => (
              <div key={s.label} className="rounded-card border border-base-200 bg-white p-5">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${s.color} mb-3`}>
                  <s.icon size={18} strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-semibold text-base-900">{s.value}</p>
                <p className="mt-0.5 text-xs text-base-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Course List */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-base-600 mb-3 flex items-center gap-1.5">
              <BookOpen size={14} strokeWidth={1.5} />
              分配课程
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {COURSES.map((course) => {
                const pct = Math.round((course.passedCount / course.levelCount) * 100);
                return (
                  <div
                    key={course.id}
                    className="rounded-card border border-base-200 bg-white p-5"
                  >
                    <h3 className="text-sm font-semibold text-base-900">{course.title}</h3>
                    <p className="mt-1 text-xs text-base-400">{course.category}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-base-400">
                      <span>{course.levelCount} 关卡</span>
                      <span className="flex items-center gap-1">
                        <Star size={11} strokeWidth={1.5} />
                        {course.totalStars} 星
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-base-100">
                      <div
                        className="h-full rounded-full bg-accent/60 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learner Table */}
          <div>
            <h2 className="text-sm font-medium text-base-600 mb-3 flex items-center gap-1.5">
              <Users size={14} strokeWidth={1.5} />
              学员进度
            </h2>
            <div className="rounded-card border border-base-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-200 text-left text-xs text-base-400 bg-base-50">
                    <th className="px-4 py-3">学员</th>
                    <th className="px-4 py-3">XP</th>
                    <th className="px-4 py-3">星数</th>
                    <th className="px-4 py-3">进度</th>
                    <th className="px-4 py-3">最近活跃</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_LEARNERS.map((learner) => {
                    const pct = Math.round((learner.passedLevels / learner.totalLevels) * 100);
                    return (
                      <tr key={learner.id} className="border-b border-base-100 hover:bg-base-50 transition">
                        <td className="px-4 py-3 font-medium text-base-900">{learner.name}</td>
                        <td className="px-4 py-3 text-accent font-medium">{learner.xp.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star size={12} strokeWidth={1.5} />
                            {learner.starsEarned}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-base-100">
                              <div
                                className="h-full rounded-full bg-accent/60"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-base-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-base-400">{learner.lastActive}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite Dialog */}
          {showInvite && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-card border border-base-200 bg-white p-6 shadow-lg">
                <h3 className="text-base font-semibold text-base-900 mb-4">邀请学员</h3>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="学员邮箱地址"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border border-base-200 bg-white py-2.5 px-3 text-sm text-base-900 placeholder:text-base-400 outline-none transition focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInvite(false)}
                      className="flex-1 rounded-lg border border-base-200 px-3 py-2 text-sm text-base-600 transition hover:bg-base-100"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleInvite}
                      className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-700"
                    >
                      发送邀请
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
