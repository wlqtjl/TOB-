/**
 * 排行榜 — Minimalist redesign
 *
 * Clean typography hierarchy, no emoji clutter, single accent color.
 * Fetches from backend API when available, falls back to mock data.
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, Star, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LeaderboardEntry } from '@skillquest/types';
import { useCourseId } from '../../../hooks/useCourseId';
import { useApiData } from '../../../hooks/useApiData';
import { COURSES, getLeaderboard, getCourse } from '../../../lib/mock-courses';
import { fetchLeaderboard } from '../../../lib/api-client';
import { tenantConfig } from '../../../lib/tenant-config';

const tenant = tenantConfig();

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 text-xs">
      <TrendingUp size={12} strokeWidth={1.5} />
      {change}
    </span>
  );
  if (change < 0) return (
    <span className="flex items-center gap-0.5 text-red-600 text-xs">
      <TrendingDown size={12} strokeWidth={1.5} />
      {Math.abs(change)}
    </span>
  );
  return <Minus size={12} strokeWidth={1.5} className="text-base-400" />;
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
            ? 'border-base-200 bg-white'
            : 'border-base-100 bg-white'
        }
      `}
    >
      <div className="flex w-8 items-center justify-center">
        {isTopThree ? (
          <span className={`text-sm font-bold ${
            entry.rank === 1 ? 'text-amber-600' : entry.rank === 2 ? 'text-base-800' : 'text-orange-600'
          }`}>
            {entry.rank}
          </span>
        ) : (
          <span className="text-sm text-base-400">{entry.rank}</span>
        )}
      </div>

      <div className={`
        flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold
        ${isCurrentUser ? 'bg-accent/20 text-accent' : 'bg-base-100 text-base-600'}
      `}>
        {entry.displayName[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isCurrentUser ? 'text-accent' : 'text-base-900'}`}>
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
        <div className={`text-base font-semibold font-mono ${isTopThree ? 'text-base-900' : 'text-base-800'}`}>
          {entry.totalScore.toLocaleString()}
        </div>
        <div className="text-xs text-base-400">分</div>
      </div>
    </div>
  );
}

function LeaderboardContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const mockData = getLeaderboard(courseId);

  // Try API first, fall back to mock data
  const { data: leaderboardData } = useApiData(
    mockData,
    async () => {
      const apiEntries = await fetchLeaderboard(courseId);
      if (apiEntries && apiEntries.length > 0) {
        return { entries: apiEntries, currentUserId: apiEntries[0]?.userId ?? '' };
      }
      return null;
    },
  );

  const { entries, currentUserId } = leaderboardData;

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">排行榜</h1>
            <p className="mt-1 text-sm font-light text-base-600">{course?.title ?? courseId} · 本周</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {['本周', '本月', '赛季', '全部'].map((period) => (
                <button
                  key={period}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    period === '本周'
                      ? 'bg-accent/10 text-accent'
                      : 'text-base-400 hover:text-base-800 hover:bg-base-100'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 transition hover:text-base-900 hover:bg-base-100"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </Link>
          </div>
        </div>

        {/* ── Course switcher ── */}
        {COURSES.length > 1 && (
          <div className="mb-6">
            <p className="text-xs text-base-400 mb-2">切换课程</p>
            <div className="flex flex-wrap gap-2">
              {COURSES.map((c) => (
                <Link
                  key={c.id}
                  href={`/leaderboard?course=${c.id}`}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    c.id === courseId
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'text-base-400 border border-base-200 hover:border-accent/40 hover:text-base-800'
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
        <div className="mt-6 flex items-center justify-between text-xs text-base-400">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-base-400 animate-pulse">加载排行榜...</p></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
