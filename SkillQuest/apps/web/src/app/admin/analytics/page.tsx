'use client';

/**
 * Admin Analytics Page — PRD §3.2
 *
 * Dashboard with:
 * - 4 core KPI cards (learner count, completion rate, activity, stars earned)
 * - Activity line chart (CSS-based)
 * - Accessible to both ADMIN and TRAINER roles
 */

import React, { useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Activity,
  Star,
  TrendingUp,
} from 'lucide-react';
import Navbar from '../../../components/layout/Navbar';
import AdminSidebar from '../../../components/layout/AdminSidebar';
import { COURSES } from '../../../lib/mock-courses';

// Mock analytics data
const DAILY_DATA = [
  { day: '04-10', learners: 12, completions: 5 },
  { day: '04-11', learners: 18, completions: 8 },
  { day: '04-12', learners: 15, completions: 6 },
  { day: '04-13', learners: 22, completions: 11 },
  { day: '04-14', learners: 20, completions: 9 },
  { day: '04-15', learners: 25, completions: 13 },
  { day: '04-16', learners: 28, completions: 15 },
];

export default function AdminAnalyticsPage() {
  const totalLearners = 156;
  const totalLevels = COURSES.reduce((s, c) => s + c.levelCount, 0);
  const totalPassed = COURSES.reduce((s, c) => s + c.passedCount, 0);
  const completionRate = totalLevels > 0 ? Math.round((totalPassed / totalLevels) * 100) : 0;
  const weeklyActive = 89;
  const totalStarsEarned = COURSES.reduce((s, c) => s + c.earnedStars, 0);

  const maxDailyValue = useMemo(
    () => Math.max(...DAILY_DATA.map((d) => Math.max(d.learners, d.completions)), 1),
    [],
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 px-6 py-8 max-w-[1280px]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-base-900">数据看板</h1>
            <p className="mt-1 text-sm text-base-400">
              实时学员数据与培训完成情况
            </p>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            {[
              {
                label: '学员数',
                value: totalLearners.toLocaleString(),
                icon: Users,
                color: 'text-blue-600 bg-blue-50',
                trend: '+12%',
              },
              {
                label: '完成率',
                value: `${completionRate}%`,
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50',
                trend: '+5%',
              },
              {
                label: '周活跃',
                value: weeklyActive.toLocaleString(),
                icon: Activity,
                color: 'text-purple-600 bg-purple-50',
                trend: '+8%',
              },
              {
                label: '获得星数',
                value: totalStarsEarned.toLocaleString(),
                icon: Star,
                color: 'text-amber-600 bg-amber-50',
                trend: '+15%',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-card border border-base-200 bg-white p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${kpi.color}`}>
                    <kpi.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                    <TrendingUp size={12} strokeWidth={1.5} />
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-base-900">{kpi.value}</p>
                <p className="mt-0.5 text-xs text-base-400">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Activity Chart */}
            <div className="rounded-card border border-base-200 bg-white p-6">
              <h2 className="text-sm font-medium text-base-600 mb-6 flex items-center gap-1.5">
                <Activity size={14} strokeWidth={1.5} />
                每日活跃趋势
              </h2>
              <div className="flex items-end gap-3 h-40">
                {DAILY_DATA.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    {/* Learners bar */}
                    <div className="w-full flex gap-1 items-end" style={{ height: '120px' }}>
                      <div
                        className="flex-1 rounded-t bg-accent/30 transition-all duration-500"
                        style={{ height: `${(d.learners / maxDailyValue) * 100}%` }}
                        title={`活跃学员: ${d.learners}`}
                      />
                      <div
                        className="flex-1 rounded-t bg-emerald-400/60 transition-all duration-500"
                        style={{ height: `${(d.completions / maxDailyValue) * 100}%` }}
                        title={`完成数: ${d.completions}`}
                      />
                    </div>
                    <span className="text-[10px] text-base-400">{d.day}</span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-xs text-base-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-accent/30" />
                  活跃学员
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-400/60" />
                  完成关卡
                </span>
              </div>
            </div>

            {/* Course Completion Breakdown */}
            <div className="rounded-card border border-base-200 bg-white p-6">
              <h2 className="text-sm font-medium text-base-600 mb-4 flex items-center gap-1.5">
                <CheckCircle2 size={14} strokeWidth={1.5} />
                各课程完成情况
              </h2>
              <div className="space-y-4">
                {COURSES.map((course) => {
                  const pct = Math.round((course.passedCount / course.levelCount) * 100);
                  return (
                    <div key={course.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-base-900">{course.title}</span>
                        <span className="text-xs text-base-400">
                          {course.passedCount}/{course.levelCount} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-base-100">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
