/**
 * Profile — User stats, badges, skill map, learning progress
 */

'use client';

import React, { Suspense } from 'react';
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
  { name: 'First Clear', icon: Shield },
  { name: 'Five Clears', icon: Target },
  { name: 'Perfect Score', icon: Sparkles },
  { name: '3-Day Streak', icon: Flame },
];

const MOCK_PATHS = [
  { name: 'SmartX HALO Certification', progress: 0.65, courses: 3, completed: 2 },
  { name: 'Network Fundamentals', progress: 0.3, courses: 4, completed: 1 },
];

function ProfileContent() {
  const xpProgress = Math.round((MOCK_USER.xp / MOCK_USER.nextLevelXp) * 100);

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-base-100">Profile</h1>
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 hover:text-base-100 hover:bg-base-700/50 transition">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Home
          </Link>
        </div>

        {/* User Card */}
        <div className="mb-8 rounded-2xl border border-base-600/30 bg-base-800/40 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-2xl">
              {MOCK_USER.avatarInitial}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-base-100">{MOCK_USER.displayName}</h2>
              <p className="text-sm text-base-400">{MOCK_USER.role} at {MOCK_USER.company} / {MOCK_USER.department}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">Level {MOCK_USER.level}</span>
                <span className="text-xs text-base-400">{MOCK_USER.title}</span>
              </div>
            </div>
          </div>
          {/* XP Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-base-400 mb-1">
              <span>{MOCK_USER.xp} XP</span>
              <span>{MOCK_USER.nextLevelXp} XP</span>
            </div>
            <div className="h-2 w-full rounded-full bg-base-700/60 overflow-hidden">
              <div className="h-full rounded-full bg-accent/60" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3">
          {[
            { label: 'Total XP', value: MOCK_USER.xp, Icon: TrendingUp },
            { label: 'Total Stars', value: MOCK_USER.totalStars, Icon: Star },
            { label: 'Courses Done', value: MOCK_USER.coursesCompleted, Icon: BookOpen },
            { label: 'Levels Passed', value: MOCK_USER.levelsPassed, Icon: Target },
            { label: 'Study Time', value: `${MOCK_USER.studyTimeHours}h`, Icon: Clock },
            { label: 'Streak', value: `${MOCK_USER.streak} days`, Icon: Flame },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-base-600/30 bg-base-800/40 p-4">
              <s.Icon size={16} strokeWidth={1.5} className="text-base-400 mb-2" />
              <p className="text-lg font-semibold text-base-100">{s.value}</p>
              <p className="text-xs text-base-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Badges */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-base-400 mb-3">Recent Badges</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {MOCK_BADGES.map((b) => (
              <div key={b.name} className="flex flex-col items-center gap-1 min-w-[72px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <b.icon size={20} strokeWidth={1.5} className="text-accent" />
                </div>
                <span className="text-xs text-base-400 text-center">{b.name}</span>
              </div>
            ))}
            <Link href="/achievements" className="flex flex-col items-center justify-center gap-1 min-w-[72px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-base-600/40 bg-base-800/30 hover:border-accent/30 transition">
                <Trophy size={20} strokeWidth={1.5} className="text-base-400" />
              </div>
              <span className="text-xs text-base-400">View All</span>
            </Link>
          </div>
        </div>

        {/* Skill Map */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-base-400 mb-3">Skill Map</h3>
          <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-5 space-y-3">
            {MOCK_SKILLS.map((skill) => (
              <div key={skill.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-base-200">{skill.name}</span>
                  <span className="text-base-400">{Math.round(skill.proficiency * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-base-700/60 overflow-hidden">
                  <div className="h-full rounded-full bg-accent/50 transition-all" style={{ width: `${skill.proficiency * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Paths */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-base-400 mb-3">Learning Paths</h3>
          <div className="space-y-3">
            {MOCK_PATHS.map((path) => (
              <div key={path.name} className="rounded-xl border border-base-600/30 bg-base-800/40 p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-base-100">{path.name}</span>
                  <span className="text-xs text-base-400">{path.completed}/{path.courses} courses</span>
                </div>
                <div className="h-2 w-full rounded-full bg-base-700/60 overflow-hidden">
                  <div className="h-full rounded-full bg-green-400/50" style={{ width: `${path.progress * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Info */}
        <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-6">
          <h3 className="text-sm font-medium text-base-400 mb-4">Profile Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Department', value: MOCK_USER.department },
              { label: 'Experience', value: MOCK_USER.experienceLevel },
              { label: 'Company', value: MOCK_USER.company },
              { label: 'Role', value: MOCK_USER.role },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-base-500 mb-0.5">{f.label}</p>
                <p className="text-base-200">{f.value}</p>
              </div>
            ))}
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
