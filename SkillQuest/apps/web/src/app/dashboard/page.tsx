'use client';

/**
 * Learner Dashboard — PRD §3.3
 *
 * Layout:
 * - "当前继续学习" large card
 * - 4 achievement tiles (XP, Stars, Streak, Badges)
 * - Sign-in calendar (last 30 days)
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Zap,
  Flame,
  Award,
  ArrowRight,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { COURSES } from '../../lib/mock-courses';
import Navbar from '../../components/layout/Navbar';

export default function DashboardPage() {
  // Find course with most progress but not fully completed
  const currentCourse = useMemo(() => {
    const inProgress = COURSES.filter((c) => c.passedCount > 0 && c.passedCount < c.levelCount);
    return inProgress.length > 0 ? inProgress[0] : COURSES[0];
  }, []);

  const totalXp = COURSES.reduce((s, c) => s + c.xp, 0);
  const totalStars = COURSES.reduce((s, c) => s + c.earnedStars, 0);

  // Mock streak and badge data
  const streakDays = 7;
  const badgeCount = 4;

  // Sign-in calendar: last 30 days (mock data)
  const today = new Date();
  const calendarDays = useMemo(() => {
    const days: { date: Date; signedIn: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // Mock: signed in on ~70% of days
      days.push({ date: d, signedIn: i === 0 || Math.random() > 0.3 });
    }
    return days;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = currentCourse
    ? Math.round((currentCourse.passedCount / currentCourse.levelCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="mx-auto max-w-[1280px] px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-base-900">
            欢迎回来
          </h1>
          <p className="mt-1 text-sm text-base-400">继续你的学习之旅</p>
        </div>

        {/* Continue Learning Card — large hero */}
        {currentCourse && (
          <Link
            href={`/map?course=${currentCourse.id}`}
            className="group mb-8 block rounded-[24px] border border-base-200 bg-white p-8 transition-all hover:border-accent/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  <Zap size={12} strokeWidth={1.5} />
                  继续学习
                </span>
                <h2 className="mt-3 text-xl font-semibold text-base-900 group-hover:text-accent transition-colors">
                  {currentCourse.title}
                </h2>
                <p className="mt-1 text-sm text-base-600">{currentCourse.description}</p>

                {/* Progress bar */}
                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-base-400">
                      {currentCourse.passedCount}/{currentCourse.levelCount} 关卡已完成
                    </span>
                    <span className="text-xs font-medium text-accent">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-base-100">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-all">
                <ArrowRight size={20} strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        )}

        {/* Achievement Tiles — 4 cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          {[
            {
              label: '经验值',
              value: totalXp.toLocaleString(),
              unit: 'XP',
              icon: Zap,
              color: 'text-accent bg-accent/10',
            },
            {
              label: '获得星数',
              value: String(totalStars),
              unit: '星',
              icon: Star,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              label: '连续签到',
              value: String(streakDays),
              unit: '天',
              icon: Flame,
              color: 'text-orange-600 bg-orange-50',
            },
            {
              label: '获得勋章',
              value: String(badgeCount),
              unit: '枚',
              icon: Award,
              color: 'text-emerald-600 bg-emerald-50',
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-card border border-base-200 bg-white p-5"
            >
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${tile.color}`}>
                <tile.icon size={18} strokeWidth={1.5} />
              </div>
              <p className="mt-3 text-2xl font-semibold text-base-900">
                {tile.value}
                <span className="ml-1 text-sm font-normal text-base-400">{tile.unit}</span>
              </p>
              <p className="mt-0.5 text-xs text-base-400">{tile.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column: Calendar + Course List */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sign-in Calendar */}
          <div className="rounded-card border border-base-200 bg-white p-6">
            <h3 className="text-sm font-medium text-base-600 mb-4 flex items-center gap-1.5">
              <Calendar size={14} strokeWidth={1.5} />
              签到日历（近 30 天）
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <div key={d} className="text-center text-xs text-base-400 pb-1">
                  {d}
                </div>
              ))}
              {/* Pad first week */}
              {Array.from({ length: (calendarDays[0]?.date.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center h-8 rounded-lg text-xs transition ${
                    day.signedIn
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'bg-base-50 text-base-300'
                  }`}
                  title={day.date.toLocaleDateString('zh-CN')}
                >
                  {day.date.getDate()}
                </div>
              ))}
            </div>
          </div>

          {/* My Courses */}
          <div className="rounded-card border border-base-200 bg-white p-6">
            <h3 className="text-sm font-medium text-base-600 mb-4 flex items-center gap-1.5">
              <BarChart3 size={14} strokeWidth={1.5} />
              我的课程
            </h3>
            <div className="space-y-3">
              {COURSES.map((course) => {
                const pct = Math.round((course.passedCount / course.levelCount) * 100);
                return (
                  <Link
                    key={course.id}
                    href={`/map?course=${course.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-base-200 p-4 transition hover:border-accent/40"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-base-900 group-hover:text-accent transition-colors">
                        {course.title}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-base-400">
                        <span className="flex items-center gap-1">
                          <Star size={11} strokeWidth={1.5} />
                          {course.earnedStars}/{course.totalStars}
                        </span>
                        <span>{course.passedCount}/{course.levelCount} 关</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-100">
                        <div
                          className="h-full rounded-full bg-accent/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-accent">{pct}%</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
