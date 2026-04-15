/**
 * Partner Management Page
 *
 * Allows partner bosses (TRAINER role) to manage employees,
 * view training progress, and assign courses.
 */

'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Star,
  TrendingUp,
  Trophy,
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';

// ─── Mock Data ───────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  coursesAssigned: number;
  progress: number;
  stars: number;
  lastActive: string;
}

interface TeamCourse {
  id: string;
  title: string;
  assigned: number;
  avgProgress: number;
  completions: number;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', name: '\u5F20\u4E09', email: 'zhangsan@partner.com', role: 'LEARNER', coursesAssigned: 3, progress: 85, stars: 24, lastActive: '2026-04-14T10:00:00Z' },
  { id: 'e2', name: '\u674E\u56DB', email: 'lisi@partner.com', role: 'LEARNER', coursesAssigned: 2, progress: 62, stars: 15, lastActive: '2026-04-13T16:30:00Z' },
  { id: 'e3', name: '\u738B\u4E94', email: 'wangwu@partner.com', role: 'LEARNER', coursesAssigned: 3, progress: 95, stars: 31, lastActive: '2026-04-14T09:15:00Z' },
  { id: 'e4', name: '\u8D75\u516D', email: 'zhaoliu@partner.com', role: 'LEARNER', coursesAssigned: 1, progress: 28, stars: 5, lastActive: '2026-04-10T14:00:00Z' },
  { id: 'e5', name: '\u5B59\u4E03', email: 'sunqi@partner.com', role: 'LEARNER', coursesAssigned: 2, progress: 45, stars: 10, lastActive: '2026-04-12T11:00:00Z' },
];

const MOCK_TEAM_COURSES: TeamCourse[] = [
  { id: 'tc1', title: 'SmartX \u8D85\u878D\u5408\u8BA4\u8BC1', assigned: 5, avgProgress: 63, completions: 2 },
  { id: 'tc2', title: '\u6DF1\u4FE1\u670D SD-WAN \u57F9\u8BAD', assigned: 3, avgProgress: 45, completions: 1 },
  { id: 'tc3', title: '\u7F51\u7EDC\u5B89\u5168\u57FA\u7840\u8BA4\u8BC1', assigned: 4, avgProgress: 72, completions: 3 },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function progressColor(p: number): string {
  if (p >= 80) return 'bg-emerald-500';
  if (p >= 40) return 'bg-yellow-500/70';
  return 'bg-red-600/70';
}

function progressTextColor(p: number): string {
  if (p >= 80) return 'text-emerald-600';
  if (p >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Partner Content ─────────────────────────────────────────────────

function PartnerContent() {
  const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [courses, setCourses] = useState<TeamCourse[]>(MOCK_TEAM_COURSES);

  const totalEmployees = employees.length;
  const avgProgress = Math.round(employees.reduce((s, e) => s + e.progress, 0) / totalEmployees);
  const totalStars = employees.reduce((s, e) => s + e.stars, 0);
  const topPerformer = employees.reduce((best, e) => (e.progress > best.progress ? e : best), employees[0]);

  const handleToggleAssign = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, assigned: c.assigned > 0 ? 0 : totalEmployees }
          : c,
      ),
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']}>
      <div className="min-h-screen bg-surface px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">
              \u56E2\u961F\u7BA1\u7406
            </h1>
            <p className="mt-1 text-sm text-base-600">
              \u5458\u5DE5\u8FDB\u5EA6\u8DDF\u8E2A \u00B7 \u8BFE\u7A0B\u5206\u914D\u7BA1\u7406
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 transition hover:text-base-900 hover:bg-base-100"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            \u8FD4\u56DE\u9996\u9875
          </Link>
        </div>

        {/* ── Team Stats ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          {[
            { label: '\u5458\u5DE5\u603B\u6570', value: totalEmployees, icon: Users, color: 'text-blue-600' },
            { label: '\u5E73\u5747\u8FDB\u5EA6', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-emerald-600' },
            { label: '\u603B\u661F\u6570', value: totalStars, icon: Star, color: 'text-amber-600' },
            { label: '\u6700\u4F73\u5458\u5DE5', value: topPerformer.name, icon: Trophy, color: 'text-purple-600' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-base-200 bg-white p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} strokeWidth={1.5} className={s.color} />
                <span className="text-xs text-base-400">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-base-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Employee Overview ── */}
        <div className="rounded-2xl border border-base-200 bg-white p-6 mb-6">
          <h2 className="text-sm font-medium text-base-600 mb-4 flex items-center gap-1.5">
            <Users size={14} strokeWidth={1.5} />
            \u5458\u5DE5\u6982\u89C8
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-200 text-left text-xs text-base-400">
                  <th className="pb-2 pr-3">\u59D3\u540D</th>
                  <th className="pb-2 pr-3">\u90AE\u7BB1</th>
                  <th className="pb-2 pr-3">\u89D2\u8272</th>
                  <th className="pb-2 pr-3">\u5DF2\u5206\u914D\u8BFE\u7A0B</th>
                  <th className="pb-2 pr-3">\u8FDB\u5EA6</th>
                  <th className="pb-2 pr-3">\u661F\u6570</th>
                  <th className="pb-2">\u6700\u540E\u6D3B\u8DC3</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-base-100">
                    <td className="py-2.5 pr-3 text-base-900 font-medium">{emp.name}</td>
                    <td className="py-2.5 pr-3 text-base-600">{emp.email}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-md bg-base-100 px-2 py-0.5 text-xs text-base-600">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-base-600">{emp.coursesAssigned}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-base-100">
                          <div
                            className={`h-full rounded-full transition-all ${progressColor(emp.progress)}`}
                            style={{ width: `${emp.progress}%` }}
                          />
                        </div>
                        <span className={`text-xs ${progressTextColor(emp.progress)}`}>
                          {emp.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1 text-amber-600 text-xs">
                        <Star size={12} strokeWidth={1.5} />
                        {emp.stars}
                      </span>
                    </td>
                    <td className="py-2.5 text-base-400 text-xs">{formatDate(emp.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Course Assignment ── */}
        <div className="rounded-2xl border border-base-200 bg-white p-6">
          <h2 className="text-sm font-medium text-base-600 mb-4 flex items-center gap-1.5">
            <BookOpen size={14} strokeWidth={1.5} />
            \u8BFE\u7A0B\u5206\u914D
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-base-200 bg-white p-5"
              >
                <h3 className="text-sm font-semibold text-base-900 mb-3">
                  {course.title}
                </h3>
                <div className="space-y-2 text-xs text-base-600">
                  <div className="flex items-center justify-between">
                    <span>\u5DF2\u5206\u914D\u5458\u5DE5</span>
                    <span className="text-base-900">{course.assigned} \u4EBA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>\u5E73\u5747\u8FDB\u5EA6</span>
                    <span className={progressTextColor(course.avgProgress)}>
                      {course.avgProgress}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>\u5B8C\u6210\u4EBA\u6570</span>
                    <span className="text-emerald-600">{course.completions} \u4EBA</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-base-100">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(course.avgProgress)}`}
                    style={{ width: `${course.avgProgress}%` }}
                  />
                </div>
                <button
                  onClick={() => handleToggleAssign(course.id)}
                  className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
                    course.assigned > 0
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-accent/30 text-accent hover:bg-accent/10'
                  }`}
                >
                  {course.assigned > 0 ? (
                    <>
                      <XCircle size={14} strokeWidth={1.5} />
                      \u53D6\u6D88\u5206\u914D
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} strokeWidth={1.5} />
                      \u5206\u914D\u7ED9\u56E2\u961F
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function PartnersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <RefreshCw size={24} className="text-base-400 animate-spin" />
        </div>
      }
    >
      <PartnerContent />
    </Suspense>
  );
}
