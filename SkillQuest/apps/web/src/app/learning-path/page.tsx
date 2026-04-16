/**
 * Learning Path — Skill tree, recommendations, active paths
 */

'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';

const ROLES = ['All', 'Engineer', 'Sales', 'Partner'];

const MOCK_RECOMMENDATIONS = [
  { courseId: 'c1', title: 'SmartX ZBS Deep Dive', reason: 'Based on your Storage skills gap', matchScore: 0.92, category: 'Storage' },
  { courseId: 'c2', title: 'Advanced OSPF', reason: 'Next step in Network path', matchScore: 0.85, category: 'Network' },
  { courseId: 'c3', title: 'Container Orchestration', reason: 'Trending among engineers', matchScore: 0.7, category: 'Cloud' },
];

const MOCK_ACTIVE_PATHS = [
  {
    id: 'lp1',
    name: 'SmartX Certified Engineer',
    description: 'Master SmartX HALO platform from basics to advanced',
    progress: 0.4,
    currentStep: 2,
    courses: [
      { id: 'c1', title: 'HALO Overview', completed: true },
      { id: 'c2', title: 'ZBS Architecture', completed: true },
      { id: 'c3', title: 'VM Management', completed: false, current: true },
      { id: 'c4', title: 'Storage Optimization', completed: false },
      { id: 'c5', title: 'Disaster Recovery', completed: false },
    ],
  },
];

const MOCK_SKILL_TREE = [
  {
    category: 'Network',
    courses: [
      { id: 'n1', title: 'Network Basics', completed: true },
      { id: 'n2', title: 'OSPF/BGP', completed: true },
      { id: 'n3', title: 'SDN Fundamentals', completed: false },
      { id: 'n4', title: 'Network Automation', completed: false },
    ],
  },
  {
    category: 'Storage',
    courses: [
      { id: 's1', title: 'Storage Basics', completed: true },
      { id: 's2', title: 'ZBS Architecture', completed: false },
      { id: 's3', title: 'Data Protection', completed: false },
    ],
  },
  {
    category: 'Virtualization',
    courses: [
      { id: 'v1', title: 'VM Concepts', completed: true },
      { id: 'v2', title: 'HALO Platform', completed: false },
      { id: 'v3', title: 'Migration Tools', completed: false },
    ],
  },
];

function LearningPathContent() {
  const [roleFilter, setRoleFilter] = useState('All');

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">Learning Paths</h1>
            <p className="mt-1 text-sm text-base-400">Personalized training roadmaps</p>
          </div>
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 hover:text-base-900 hover:bg-base-100 transition">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Home
          </Link>
        </div>

        {/* Role Filter */}
        <div className="flex gap-2 mb-8">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`rounded-lg px-3 py-1.5 text-xs transition ${roleFilter === r ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-800 hover:bg-base-100'}`}>
              {r}
            </button>
          ))}
        </div>

        {/* Recommendations */}
        <div className="mb-10">
          <h3 className="text-sm font-medium text-base-400 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} strokeWidth={1.5} />
            Recommended for You
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MOCK_RECOMMENDATIONS.map((rec) => (
              <div key={rec.courseId} className="rounded-2xl border border-base-200 bg-white p-5">
                <span className="text-xs text-base-400">{rec.category}</span>
                <h4 className="mt-1 text-sm font-semibold text-base-900">{rec.title}</h4>
                <p className="mt-1 text-xs text-base-400">{rec.reason}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-base-400">Match</span>
                    <span className="text-base-600">{Math.round(rec.matchScore * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-base-100 overflow-hidden">
                    <div className="h-full rounded-full bg-accent/50" style={{ width: `${rec.matchScore * 100}%` }} />
                  </div>
                </div>
                <button className="mt-3 w-full rounded-lg border border-accent/30 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 transition">
                  Start Course
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Paths */}
        <div className="mb-10">
          <h3 className="text-sm font-medium text-base-400 mb-3">Active Learning Paths</h3>
          {MOCK_ACTIVE_PATHS.map((path) => (
            <div key={path.id} className="rounded-2xl border border-base-200 bg-white p-6 mb-4">
              <div className="flex justify-between mb-1">
                <h4 className="text-base font-semibold text-base-900">{path.name}</h4>
                <span className="text-xs text-base-400">{Math.round(path.progress * 100)}%</span>
              </div>
              <p className="text-xs text-base-400 mb-3">{path.description}</p>
              <div className="h-2 w-full rounded-full bg-base-100 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${path.progress * 100}%` }} />
              </div>
              <div className="space-y-2">
                {path.courses.map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${(c as { current?: boolean }).current ? 'bg-accent/5 border border-accent/20' : ''}`}>
                    {c.completed ? (
                      <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-600" />
                    ) : (c as { current?: boolean }).current ? (
                      <ChevronRight size={16} strokeWidth={1.5} className="text-accent" />
                    ) : (
                      <Circle size={16} strokeWidth={1.5} className="text-base-600" />
                    )}
                    <span className={`text-sm ${c.completed ? 'text-base-600 line-through' : (c as { current?: boolean }).current ? 'text-accent font-medium' : 'text-base-400'}`}>
                      {i + 1}. {c.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Skill Tree */}
        <div>
          <h3 className="text-sm font-medium text-base-400 mb-3 flex items-center gap-1.5">
            <GitBranch size={14} strokeWidth={1.5} />
            Skill Tree
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MOCK_SKILL_TREE.map((branch) => {
              const completed = branch.courses.filter((c) => c.completed).length;
              return (
                <div key={branch.category} className="rounded-2xl border border-base-200 bg-white p-5">
                  <div className="flex justify-between mb-3">
                    <h4 className="text-sm font-semibold text-base-900">{branch.category}</h4>
                    <span className="text-xs text-base-400">{completed}/{branch.courses.length}</span>
                  </div>
                  <div className="space-y-2">
                    {branch.courses.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        {c.completed ? (
                          <CheckCircle2 size={14} strokeWidth={1.5} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Circle size={14} strokeWidth={1.5} className="text-base-600 shrink-0" />
                        )}
                        <span className={`text-xs ${c.completed ? 'text-base-600' : 'text-base-400'}`}>{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearningPathPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-base-400 animate-pulse">Loading learning paths...</p></div>}>
      <LearningPathContent />
    </Suspense>
  );
}
