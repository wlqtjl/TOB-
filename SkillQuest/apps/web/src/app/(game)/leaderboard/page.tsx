/**
 * 排行榜 — Minimalist redesign
 *
 * Clean typography hierarchy, no emoji clutter, single accent color
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, Star, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LeaderboardEntry } from '@skillquest/types';
import { useCourseId } from '../../../hooks/useCourseId';
import { COURSES, getLeaderboard, getCourse } from '../../../lib/mock-courses';
import { tenantConfig } from '../../../lib/tenant-config';

const tenant = tenantConfig();

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-green-400 text-xs">
      <TrendingUp size={12} strokeWidth={1.5} />
      {change}
    </span>
  );
  if (change < 0) return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs">
      <TrendingDown size={12} strokeWidth={1.5} />
      {Math.abs(change)}
    </span>
  );
  return <Minus size={12} strokeWidth={1.5} className="text-base-500" />;
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const isTopThree = entry.rank <= 3;

  return (
    <div
      className={`
        flex items-center gap-4 rounded-xl border p-5 transition-all
        ${isCurrentUser
          ? 'border-accent/30 bg-accent/5'
          : isTopThree
            ? 'border-base-600/40 bg-base-800/60'
            : 'border-base-600/20 bg-base-800/20'
        }
      `}
    >
      <div className="flex w-8 items-center justify-center">
        {isTopThree ? (
          <span className={`text-sm font-bold ${
            entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-base-200' : 'text-orange-400'
          }`}>
            {entry.rank}
          </span>
        ) : (
          <span className="text-sm text-base-500">{entry.rank}</span>
        )}
      </div>

      <div className={`
        flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold
        ${isCurrentUser ? 'bg-accent/20 text-accent' : 'bg-base-700 text-base-300'}
      `}>
        {entry.displayName[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isCurrentUser ? 'text-accent' : 'text-base-100'}`}>
            {entry.displayName}
          </span>
          <RankChangeIndicator change={entry.rankChange} />
        </div>
        <div className="flex gap-3 text-xs text-base-400 mt-0.5">
          <span className="flex items-center gap-1">
            <Star size={11} strokeWidth={1.5} />
            {entry.stars}
          </span>
          <span className="flex items-center gap-1">
            <Flame size={11} strokeWidth={1.5} />
            {entry.streakDays} 天
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className={`text-base font-semibold font-mono ${isTopThree ? 'text-base-100' : 'text-base-200'}`}>
          {entry.totalScore.toLocaleString()}
        </div>
        <div className="text-xs text-base-500">分</div>
      </div>
    </div>
  );
}

function LeaderboardContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const { entries, currentUserId } = getLeaderboard(courseId);

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-100">排行榜</h1>
            <p className="mt-1 text-sm font-light text-base-300">{course?.title ?? courseId} · 本周</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {['本周', '本月', '赛季', '全部'].map((period) => (
                <button
                  key={period}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    period === '本周'
                      ? 'bg-accent/10 text-accent'
                      : 'text-base-400 hover:text-base-200 hover:bg-base-700/50'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 transition hover:text-base-100 hover:bg-base-700/50"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </Link>
          </div>
        </div>

        {/* ── Course switcher ── */}
        {COURSES.length > 1 && (
          <div className="mb-6">
            <p className="text-xs text-base-500 mb-2">切换课程</p>
            <div className="flex flex-wrap gap-2">
              {COURSES.map((c) => (
                <Link
                  key={c.id}
                  href={`/leaderboard?course=${c.id}`}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    c.id === courseId
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'text-base-400 border border-base-600/30 hover:border-base-500 hover:text-base-200'
                  }`}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Rows ── */}
        <div className="space-y-2">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === currentUserId}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between text-xs text-base-500">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            实时更新中
          </span>
          <span>{tenant.companyName}</span>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-900 flex items-center justify-center"><p className="text-base-400 animate-pulse">加载排行榜...</p></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
