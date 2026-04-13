/**
 * Admin Dashboard — Course Management + Data Visualization
 *
 * Provides:
 * - Course overview with level counts and completion rates
 * - User learning summary (total score, attempts, progress)
 * - Daily activity chart (bar chart using CSS)
 * - CSV export for analytics data
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Download,
  Users,
  Trophy,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  fetchCourses,
  fetchCourseSummary,
  fetchDailyActivity,
  type ApiCourse,
  type CourseSummary,
  type DailyActivity,
} from '../../../lib/api-client';
import { COURSES } from '../../../lib/mock-courses';
import { tenantConfig } from '../../../lib/tenant-config';

const tenant = tenantConfig();

// ─── Types ───────────────────────────────────────────────────────────

interface DashboardData {
  courses: Array<{ id: string; title: string; vendor: string; category: string; levelCount: number }>;
  courseSummaries: Map<string, CourseSummary>;
  dailyActivity: DailyActivity | null;
}

// ─── CSV Export Helper ───────────────────────────────────────────────

function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Dashboard Content ───────────────────────────────────────────────

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try fetching from API first
      const apiCourses = await fetchCourses();
      const dailyActivity = await fetchDailyActivity(30);

      let courses: DashboardData['courses'];
      const summaries = new Map<string, CourseSummary>();

      if (apiCourses && apiCourses.length > 0) {
        courses = apiCourses.map((c) => ({
          id: c.id,
          title: c.title,
          vendor: c.vendor,
          category: c.category,
          levelCount: c._count?.levels ?? c.levels?.length ?? 0,
        }));

        // Fetch summaries for each course
        await Promise.all(
          courses.map(async (c) => {
            const summary = await fetchCourseSummary(c.id);
            if (summary) summaries.set(c.id, summary);
          }),
        );
      } else {
        // Fallback to mock data
        courses = COURSES.map((c) => ({
          id: c.id,
          title: c.title,
          vendor: c.vendor,
          category: c.category,
          levelCount: c.levelCount,
        }));

        // Generate mock summaries
        for (const c of COURSES) {
          summaries.set(c.id, {
            totalAttempts: c.passedCount * 3 + Math.floor(Math.random() * 20),
            averageScore: 720 + Math.floor(Math.random() * 200),
            completionByStatus: {
              PASSED: c.passedCount,
              IN_PROGRESS: Math.floor(c.levelCount * 0.15),
              LOCKED: c.levelCount - c.passedCount - Math.floor(c.levelCount * 0.15),
            },
          });
        }
      }

      setData({
        courses,
        courseSummaries: summaries,
        dailyActivity: dailyActivity ?? {
          period: '30d',
          since: new Date(Date.now() - 30 * 86400000).toISOString(),
          eventCounts: {
            'level.start': 156,
            'level.complete': 89,
            'level.fail': 34,
            'quiz.answer': 445,
            'login': 67,
          },
        },
      });
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportCsv = useCallback(() => {
    if (!data) return;

    const headers = ['Course', 'Vendor', 'Category', 'Levels', 'Attempts', 'Avg Score', 'Passed', 'In Progress'];
    const rows = data.courses.map((c) => {
      const s = data.courseSummaries.get(c.id);
      return [
        c.title,
        c.vendor,
        c.category,
        String(c.levelCount),
        String(s?.totalAttempts ?? 0),
        String(s?.averageScore ?? 0),
        String(s?.completionByStatus?.PASSED ?? 0),
        String(s?.completionByStatus?.IN_PROGRESS ?? 0),
      ];
    });

    exportToCsv(`skillquest-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <RefreshCw size={24} className="text-base-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <p className="text-red-400">{error ?? 'No data available'}</p>
      </div>
    );
  }

  const totalLevels = data.courses.reduce((s, c) => s + c.levelCount, 0);
  const totalAttempts = Array.from(data.courseSummaries.values()).reduce((s, c) => s + c.totalAttempts, 0);
  const avgScore = data.courseSummaries.size > 0
    ? Math.round(Array.from(data.courseSummaries.values()).reduce((s, c) => s + c.averageScore, 0) / data.courseSummaries.size)
    : 0;
  const totalPassed = Array.from(data.courseSummaries.values()).reduce(
    (s, c) => s + (c.completionByStatus?.PASSED ?? 0), 0,
  );

  // Daily activity chart data
  const activityEntries = data.dailyActivity
    ? Object.entries(data.dailyActivity.eventCounts)
    : [];
  const maxActivityCount = Math.max(...activityEntries.map(([, v]) => v), 1);

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-100">
            {tenant.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-base-300">
            {tenant.companyName} Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500 hover:text-base-100"
          >
            <Download size={14} strokeWidth={1.5} />
            Export CSV
          </button>
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500 hover:text-base-100"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            Refresh
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 transition hover:text-base-100 hover:bg-base-700/50"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Home
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
          { label: 'Courses', value: data.courses.length, icon: BookOpen, color: 'text-blue-400' },
          { label: 'Total Levels', value: totalLevels, icon: BarChart3, color: 'text-green-400' },
          { label: 'Total Attempts', value: totalAttempts, icon: Users, color: 'text-purple-400' },
          { label: 'Avg Score', value: avgScore, icon: Trophy, color: 'text-yellow-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-base-600/30 bg-base-800/40 p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} strokeWidth={1.5} className={s.color} />
              <span className="text-xs text-base-400">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold text-base-100">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Course Table */}
        <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
          <h2 className="text-sm font-medium text-base-300 mb-4 flex items-center gap-1.5">
            <BookOpen size={14} strokeWidth={1.5} />
            Course Overview
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-700/50 text-left text-xs text-base-400">
                  <th className="pb-2 pr-3">Course</th>
                  <th className="pb-2 pr-3">Levels</th>
                  <th className="pb-2 pr-3">Attempts</th>
                  <th className="pb-2 pr-3">Avg Score</th>
                  <th className="pb-2">Passed</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => {
                  const s = data.courseSummaries.get(c.id);
                  return (
                    <tr key={c.id} className="border-b border-base-700/20">
                      <td className="py-2.5 pr-3">
                        <p className="text-base-100 font-medium">{c.title}</p>
                        <p className="text-xs text-base-400">{c.vendor} / {c.category}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-base-300">{c.levelCount}</td>
                      <td className="py-2.5 pr-3 text-base-300">{s?.totalAttempts ?? '-'}</td>
                      <td className="py-2.5 pr-3 text-base-300">{s?.averageScore ?? '-'}</td>
                      <td className="py-2.5 text-green-400">{s?.completionByStatus?.PASSED ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
          <h2 className="text-sm font-medium text-base-300 mb-4 flex items-center gap-1.5">
            <Activity size={14} strokeWidth={1.5} />
            Activity Summary (Last 30 Days)
          </h2>
          {activityEntries.length > 0 ? (
            <div className="space-y-3">
              {activityEntries.map(([event, count]) => (
                <div key={event}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-base-300">{event}</span>
                    <span className="text-xs text-base-400">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-base-700/40">
                    <div
                      className="h-full rounded-full bg-accent/60 transition-all"
                      style={{ width: `${(count / maxActivityCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-400">No activity data available</p>
          )}

          {/* Completion Summary */}
          <div className="mt-6 pt-4 border-t border-base-700/30">
            <h3 className="text-xs font-medium text-base-400 mb-3">Completion Rate</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 overflow-hidden rounded-full bg-base-700/40 flex">
                <div
                  className="h-full bg-green-500/70"
                  style={{ width: `${totalLevels > 0 ? (totalPassed / totalLevels) * 100 : 0}%` }}
                  title={`Passed: ${totalPassed}`}
                />
                <div
                  className="h-full bg-blue-500/50"
                  style={{ width: `${totalLevels > 0 ? ((totalLevels - totalPassed) / totalLevels) * 50 : 0}%` }}
                  title="Remaining"
                />
              </div>
              <span className="text-xs text-base-300 whitespace-nowrap">
                {totalPassed}/{totalLevels} levels
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-base-900 flex items-center justify-center">
          <RefreshCw size={24} className="text-base-400 animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
