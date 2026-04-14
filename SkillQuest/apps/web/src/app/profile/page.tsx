/**
 * Profile — User stats, badges, skill map, learning progress
 * Layout: two-column sidebar + main, with Overview / Skills / Activity tabs
 */

'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Trophy,
  Clock,
  Flame,
  BookOpen,
  Target,
  Shield,
  Sparkles,
  TrendingUp,
  Edit2,
  Check,
  X,
  GitBranch,
  CheckCircle2,
  Circle,
  Activity,
} from 'lucide-react';

const MOCK_USER = {
  displayName: 'Alex Chen',
  role: 'Engineer',
  avatarInitial: 'A',
  level: 5,
  title: 'Intermediate',
  xp: 750,
  nextLevelXp: 1000,
  totalStars: 27,
  coursesCompleted: 2,
  levelsPassed: 14,
  studyTimeHours: 12.5,
  streak: 3,
  department: 'Technical Support',
  experienceLevel: 'Mid-Level',
  company: 'SmartX',
};

const MOCK_SKILLS = [
  { name: 'Networking', proficiency: 0.8 },
  { name: 'Storage', proficiency: 0.6 },
  { name: 'Virtualization', proficiency: 0.45 },
  { name: 'Security', proficiency: 0.3 },
  { name: 'Cloud', proficiency: 0.2 },
];

const MOCK_BADGES = [
  { name: 'First Clear', icon: Shield, rarity: 'common' },
  { name: 'Five Clears', icon: Target, rarity: 'uncommon' },
  { name: 'Perfect Score', icon: Sparkles, rarity: 'uncommon' },
  { name: '3-Day Streak', icon: Flame, rarity: 'common' },
];

const MOCK_PATHS = [
  { name: 'SmartX HALO Certification', progress: 0.65, courses: 3, completed: 2 },
  { name: 'Network Fundamentals', progress: 0.3, courses: 4, completed: 1 },
];

const MOCK_ACTIVITY = [
  { id: 'a1', type: 'level', text: 'Completed level "ZBS Replica Rescue"', detail: '+120 XP · 3 stars', time: '2 hours ago' },
  { id: 'a2', type: 'badge', text: 'Earned badge "Perfect Score"', detail: 'Uncommon', time: 'Yesterday' },
  { id: 'a3', type: 'level', text: 'Completed level "OSPF Configuration"', detail: '+90 XP · 2 stars', time: 'Yesterday' },
  { id: 'a4', type: 'path', text: 'Started learning path "Network Fundamentals"', detail: '4 courses', time: '3 days ago' },
  { id: 'a5', type: 'level', text: 'Completed level "Network Basics"', detail: '+80 XP · 3 stars', time: '4 days ago' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'border-base-400/60',
  uncommon: 'border-green-400/60',
  rare: 'border-blue-400/60',
  epic: 'border-purple-400/60',
};

const TABS = ['Overview', 'Skills', 'Activity'] as const;
type Tab = typeof TABS[number];

function ActivityIcon({ type }: { type: string }) {
  if (type === 'badge') return <Trophy size={14} strokeWidth={1.5} className="text-yellow-400" />;
  if (type === 'path') return <GitBranch size={14} strokeWidth={1.5} className="text-blue-400" />;
  return <CheckCircle2 size={14} strokeWidth={1.5} className="text-green-400" />;
}

function ProfileContent() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState(MOCK_USER.role);
  const [editDept, setEditDept] = useState(MOCK_USER.department);
  const [savedRole, setSavedRole] = useState(MOCK_USER.role);
  const [savedDept, setSavedDept] = useState(MOCK_USER.department);

  const xpProgress = Math.round((MOCK_USER.xp / MOCK_USER.nextLevelXp) * 100);

  function handleSave() {
    setSavedRole(editRole);
    setSavedDept(editDept);
    setEditing(false);
  }

  function handleCancel() {
    setEditRole(savedRole);
    setEditDept(savedDept);
    setEditing(false);
  }

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-base-100">Profile</h1>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 hover:text-base-100 hover:bg-base-700/50 transition"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Home
          </Link>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

          {/* ── Left Sidebar ── */}
          <aside className="space-y-5">

            {/* Identity Card */}
            <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-3xl border border-accent/20">
                  {MOCK_USER.avatarInitial}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-base-100">{MOCK_USER.displayName}</h2>
                  {editing ? (
                    <div className="mt-2 space-y-2 text-left">
                      <input
                        className="w-full rounded-lg border border-base-600/50 bg-base-700/60 px-2.5 py-1.5 text-xs text-base-100 focus:outline-none focus:border-accent/50"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="Role"
                      />
                      <input
                        className="w-full rounded-lg border border-base-600/50 bg-base-700/60 px-2.5 py-1.5 text-xs text-base-100 focus:outline-none focus:border-accent/50"
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        placeholder="Department"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent/80 px-2 py-1.5 text-xs font-medium text-white hover:bg-accent transition"
                        >
                          <Check size={12} strokeWidth={2} /> Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-base-600/50 px-2 py-1.5 text-xs text-base-400 hover:text-base-200 transition"
                        >
                          <X size={12} strokeWidth={2} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-0.5 text-xs text-base-400">{savedRole} · {savedDept}</p>
                      <p className="text-xs text-base-500">{MOCK_USER.company}</p>
                      <button
                        onClick={() => setEditing(true)}
                        className="mt-2 flex items-center gap-1 text-xs text-base-500 hover:text-base-300 transition mx-auto"
                      >
                        <Edit2 size={11} strokeWidth={1.5} /> Edit
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">Level {MOCK_USER.level}</span>
                  <span className="text-xs text-base-400">{MOCK_USER.title}</span>
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-base-400">
                  <span>{MOCK_USER.xp} XP</span>
                  <span>{xpProgress}% to next level</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-base-700/60">
                  <div className="h-full rounded-full bg-accent/60 transition-all" style={{ width: `${xpProgress}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-base-500">{MOCK_USER.nextLevelXp} XP</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-4 space-y-3">
              {[
                { label: 'Total Stars', value: MOCK_USER.totalStars, Icon: Star },
                { label: 'Study Time', value: `${MOCK_USER.studyTimeHours}h`, Icon: Clock },
                { label: 'Streak', value: `${MOCK_USER.streak} days`, Icon: Flame },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <s.Icon size={15} strokeWidth={1.5} className="text-base-500 shrink-0" />
                  <span className="flex-1 text-xs text-base-400">{s.label}</span>
                  <span className="text-sm font-semibold text-base-100">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-medium text-base-400">Recent Badges</h3>
                <Link href="/achievements" className="text-xs text-base-500 hover:text-accent transition">View All</Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MOCK_BADGES.map((b) => (
                  <div key={b.name} className="flex flex-col items-center gap-1">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-base-800/60 ${RARITY_COLORS[b.rarity] ?? RARITY_COLORS.common}`}>
                      <b.icon size={18} strokeWidth={1.5} className="text-base-200" />
                    </div>
                    <span className="text-center text-[10px] leading-tight text-base-500">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Info */}
            <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-4">
              <h3 className="mb-3 text-xs font-medium text-base-400">Info</h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Company', value: MOCK_USER.company },
                  { label: 'Experience', value: MOCK_USER.experienceLevel },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-base-500">{f.label}</span>
                    <span className="text-base-200">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className="min-w-0">

            {/* Tabs */}
            <div className="mb-6 flex gap-1 border-b border-base-700/40 pb-0">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-t-lg px-4 py-2 text-sm transition ${
                    tab === t
                      ? 'border-b-2 border-accent text-accent font-medium'
                      : 'text-base-400 hover:text-base-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'Overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Total XP', value: MOCK_USER.xp, Icon: TrendingUp },
                    { label: 'Courses Done', value: MOCK_USER.coursesCompleted, Icon: BookOpen },
                    { label: 'Levels Passed', value: MOCK_USER.levelsPassed, Icon: Target },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-base-600/30 bg-base-800/40 p-4">
                      <s.Icon size={16} strokeWidth={1.5} className="text-base-400 mb-2" />
                      <p className="text-2xl font-semibold text-base-100">{s.value}</p>
                      <p className="text-xs text-base-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Learning Paths */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-base-400">Learning Paths</h3>
                    <Link href="/learning-path" className="text-xs text-base-500 hover:text-accent transition">
                      Manage
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {MOCK_PATHS.map((path) => (
                      <div key={path.name} className="rounded-xl border border-base-600/30 bg-base-800/40 p-4">
                        <div className="mb-2 flex justify-between">
                          <span className="text-sm font-medium text-base-100">{path.name}</span>
                          <span className="text-xs text-base-400">{path.completed}/{path.courses} courses</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-base-700/60">
                          <div
                            className="h-full rounded-full bg-green-400/50 transition-all"
                            style={{ width: `${path.progress * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-base-500">{Math.round(path.progress * 100)}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { href: '/achievements', label: 'Achievements', desc: 'Badges & milestones', Icon: Trophy },
                    { href: '/learning-path', label: 'Learning Path', desc: 'Skill tree & roadmap', Icon: GitBranch },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-xl border border-base-600/30 bg-base-800/30 p-4 transition hover:border-accent/30 hover:bg-base-700/30"
                    >
                      <item.Icon size={18} strokeWidth={1.5} className="text-base-400 group-hover:text-accent transition" />
                      <p className="mt-2 text-sm font-semibold text-base-100 group-hover:text-accent-300 transition">{item.label}</p>
                      <p className="text-xs text-base-400">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Skills Tab ── */}
            {tab === 'Skills' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-6 space-y-4">
                  {MOCK_SKILLS.map((skill) => (
                    <div key={skill.name}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="font-medium text-base-200">{skill.name}</span>
                        <span className="text-base-400">{Math.round(skill.proficiency * 100)}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-700/60">
                        <div
                          className="h-full rounded-full bg-accent/50 transition-all"
                          style={{ width: `${skill.proficiency * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skill levels legend */}
                <div className="flex flex-wrap gap-4 text-xs text-base-500">
                  {[
                    { label: 'Beginner', range: '0–30%' },
                    { label: 'Developing', range: '30–60%' },
                    { label: 'Proficient', range: '60–80%' },
                    { label: 'Expert', range: '80–100%' },
                  ].map((lvl) => (
                    <div key={lvl.label} className="flex items-center gap-1.5">
                      <Circle size={8} strokeWidth={1.5} className="text-base-600" />
                      <span>{lvl.label} <span className="text-base-600">({lvl.range})</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Activity Tab ── */}
            {tab === 'Activity' && (
              <div>
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-400">
                  <Activity size={14} strokeWidth={1.5} />
                  Recent Activity
                </h3>
                <div className="relative space-y-0">
                  {MOCK_ACTIVITY.map((item, idx) => (
                    <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {idx < MOCK_ACTIVITY.length - 1 && (
                        <div className="absolute left-[15px] top-7 h-full w-px bg-base-700/40" />
                      )}
                      {/* Icon */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-base-700/40 bg-base-800">
                        <ActivityIcon type={item.type} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 rounded-xl border border-base-600/20 bg-base-800/30 p-3">
                        <p className="text-sm text-base-100">{item.text}</p>
                        <div className="mt-1 flex justify-between text-xs">
                          <span className="text-base-400">{item.detail}</span>
                          <span className="text-base-500">{item.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-900 flex items-center justify-center"><p className="text-base-400 animate-pulse">Loading profile...</p></div>}>
      <ProfileContent />
    </Suspense>
  );
}
