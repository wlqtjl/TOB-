/**
 * Analytics — Enterprise learning analytics dashboard
 */

'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Download,
} from 'lucide-react';

const PERIODS = ['This Week', 'This Month', 'This Quarter'];

const MOCK_SUMMARY = { activeLearners: 156, coursesCompleted: 423, avgScore: 78, completionRate: 72 };

const MOCK_COURSES = [
  { id: '1', title: 'SmartX HALO Overview', learners: 45, avgScore: 82, passRate: 88, avgTime: '25m', topChallenge: 'ZBS Storage Architecture' },
  { id: '2', title: 'Network Fundamentals', learners: 67, avgScore: 75, passRate: 79, avgTime: '32m', topChallenge: 'OSPF Configuration' },
  { id: '3', title: 'VMware Migration', learners: 28, avgScore: 71, passRate: 68, avgTime: '40m', topChallenge: 'V2V Migration Steps' },
  { id: '4', title: 'Security Essentials', learners: 16, avgScore: 85, passRate: 92, avgTime: '20m', topChallenge: 'Firewall Rules' },
];

const MOCK_DEPARTMENTS = [
  { name: 'Engineering', network: 85, storage: 72, virtualization: 60, security: 45 },
  { name: 'Sales', network: 45, storage: 30, virtualization: 25, security: 55 },
  { name: 'Support', network: 90, storage: 80, virtualization: 70, security: 65 },
  { name: 'Partners', network: 60, storage: 50, virtualization: 40, security: 35 },
];

const MOCK_TOP_LEARNERS = [
  { name: 'Wang Li', xp: 2450, department: 'Engineering' },
  { name: 'Zhang Wei', xp: 2100, department: 'Support' },
  { name: 'Chen Jing', xp: 1890, department: 'Engineering' },
  { name: 'Liu Mei', xp: 1650, department: 'Sales' },
  { name: 'Zhao Peng', xp: 1520, department: 'Partners' },
];

function heatColor(value: number) {
  if (value >= 80) return 'bg-emerald-500/30 text-green-300';
  if (value >= 60) return 'bg-blue-400/20 text-blue-300';
  if (value >= 40) return 'bg-yellow-400/15 text-yellow-300';
  return 'bg-red-400/10 text-red-300';
}

function AnalyticsContent() {
  const [period, setPeriod] = useState('This Month');

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">Learning Analytics</h1>
            <p className="mt-1 text-sm text-base-400">Enterprise training performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`rounded-lg px-3 py-1.5 text-xs transition ${period === p ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-800 hover:bg-base-100'}`}>
                  {p}
                </button>
              ))}
            </div>
            <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 hover:text-base-900 hover:bg-base-100 transition">
              <ArrowLeft size={14} strokeWidth={1.5} />
              Home
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          {[
            { label: 'Active Learners', value: MOCK_SUMMARY.activeLearners, Icon: Users },
            { label: 'Courses Completed', value: MOCK_SUMMARY.coursesCompleted, Icon: BookOpen },
            { label: 'Avg Score', value: MOCK_SUMMARY.avgScore, Icon: Target },
            { label: 'Completion Rate', value: `${MOCK_SUMMARY.completionRate}%`, Icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-base-200 bg-white p-4">
              <s.Icon size={16} strokeWidth={1.5} className="text-base-400 mb-2" />
              <p className="text-2xl font-semibold text-base-900">{s.value}</p>
              <p className="text-xs text-base-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Course Performance Table */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-base-400 mb-3">Course Performance</h3>
          <div className="rounded-2xl border border-base-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-200/40">
                  <th className="text-left px-4 py-3 text-xs text-base-400 font-medium">Course</th>
                  <th className="text-right px-4 py-3 text-xs text-base-400 font-medium">Learners</th>
                  <th className="text-right px-4 py-3 text-xs text-base-400 font-medium">Avg Score</th>
                  <th className="text-right px-4 py-3 text-xs text-base-400 font-medium">Pass Rate</th>
                  <th className="text-right px-4 py-3 text-xs text-base-400 font-medium">Avg Time</th>
                  <th className="text-left px-4 py-3 text-xs text-base-400 font-medium">Top Challenge</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_COURSES.map((c) => (
                  <tr key={c.id} className="border-b border-base-100 last:border-0">
                    <td className="px-4 py-3 text-base-900">{c.title}</td>
                    <td className="px-4 py-3 text-right text-base-800">{c.learners}</td>
                    <td className="px-4 py-3 text-right text-base-800">{c.avgScore}</td>
                    <td className="px-4 py-3 text-right text-base-800">{c.passRate}%</td>
                    <td className="px-4 py-3 text-right text-base-600">{c.avgTime}</td>
                    <td className="px-4 py-3 text-base-400">{c.topChallenge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Heatmap */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-base-400 mb-3">Department Completion Heatmap</h3>
          <div className="rounded-2xl border border-base-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-200/40">
                  <th className="text-left px-4 py-3 text-xs text-base-400 font-medium">Department</th>
                  <th className="text-center px-4 py-3 text-xs text-base-400 font-medium">Network</th>
                  <th className="text-center px-4 py-3 text-xs text-base-400 font-medium">Storage</th>
                  <th className="text-center px-4 py-3 text-xs text-base-400 font-medium">Virtualization</th>
                  <th className="text-center px-4 py-3 text-xs text-base-400 font-medium">Security</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DEPARTMENTS.map((d) => (
                  <tr key={d.name} className="border-b border-base-100 last:border-0">
                    <td className="px-4 py-3 text-base-900">{d.name}</td>
                    {[d.network, d.storage, d.virtualization, d.security].map((v, i) => (
                      <td key={i} className="px-4 py-2 text-center">
                        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${heatColor(v)}`}>{v}%</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Top Learners */}
          <div>
            <h3 className="text-sm font-medium text-base-400 mb-3">Top Learners</h3>
            <div className="rounded-2xl border border-base-200 bg-white p-4 space-y-2">
              {MOCK_TOP_LEARNERS.map((l, i) => (
                <div key={l.name} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-base-100 transition">
                  <span className={`text-sm font-bold w-5 ${i < 3 ? 'text-accent' : 'text-base-400'}`}>{i + 1}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-base-100 text-xs font-semibold text-base-600">{l.name[0]}</div>
                  <div className="flex-1">
                    <p className="text-sm text-base-900">{l.name}</p>
                    <p className="text-xs text-base-400">{l.department}</p>
                  </div>
                  <span className="text-sm font-medium text-base-800">{l.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div>
            <h3 className="text-sm font-medium text-base-400 mb-3">Reports</h3>
            <div className="rounded-2xl border border-base-200 bg-white p-6 flex flex-col items-center justify-center gap-4">
              <Download size={32} strokeWidth={1.5} className="text-base-400" />
              <p className="text-sm text-base-600 text-center">Export training reports as CSV or PDF</p>
              <button className="rounded-lg bg-accent/80 px-4 py-2 text-sm font-medium text-white hover:bg-accent transition">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-base-400 animate-pulse">Loading analytics...</p></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
