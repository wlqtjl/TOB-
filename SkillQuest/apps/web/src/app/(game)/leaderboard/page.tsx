/**
 * 实时排行榜 — 单租户课程支持
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import type { LeaderboardEntry } from '@skillquest/types';
import { useCourseId } from '../../../hooks/useCourseId';
import { COURSES, getLeaderboard, getCourse } from '../../../lib/mock-courses';
import { tenantConfig } from '../../../lib/tenant-config';

const tenant = tenantConfig();
const CROWN_ICONS = ['👑', '🥈', '🥉'];

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="text-green-400 text-xs font-mono">↑{change}</span>;
  if (change < 0) return <span className="text-red-400 text-xs font-mono">↓{Math.abs(change)}</span>;
  return <span className="text-gray-600 text-xs">—</span>;
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const isTopThree = entry.rank <= 3;

  return (
    <div
      className={`
        flex items-center gap-4 rounded-xl border p-4 transition-all
        ${isCurrentUser
          ? 'border-blue-500/50 bg-blue-900/20'
          : isTopThree
            ? 'border-yellow-400/20 bg-yellow-950/10'
            : 'border-gray-800 bg-gray-900/30'
        }
      `}
    >
      <div className="flex w-10 items-center justify-center text-lg font-bold">
        {isTopThree ? CROWN_ICONS[entry.rank - 1] : (
          <span className="text-gray-500">{entry.rank}</span>
        )}
      </div>

      <div className={`
        h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold
        ${isCurrentUser ? 'bg-blue-600' : 'bg-gray-700'}
      `}>
        {entry.displayName[0]}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isCurrentUser ? 'text-blue-300' : 'text-gray-200'}`}>
            {entry.displayName}
          </span>
          <RankChangeIndicator change={entry.rankChange} />
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>⭐ {entry.stars} 星</span>
          <span>🔥 连续 {entry.streakDays} 天</span>
        </div>
      </div>

      <div className="text-right">
        <div className={`text-lg font-bold font-mono ${isTopThree ? 'text-yellow-400' : 'text-gray-300'}`}>
          {entry.totalScore.toLocaleString()}
        </div>
        <div className="text-xs text-gray-600">分</div>
      </div>
    </div>
  );
}

function LeaderboardContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const { entries, currentUserId } = getLeaderboard(courseId);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">🏆 实时排行榜</h1>
            <p className="text-sm text-gray-500">{course?.title ?? courseId} · 全部学员 · 本周</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {['本周', '本月', '赛季', '全部'].map((period) => (
                <button
                  key={period}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    period === '本周'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <Link
              href="/"
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
            >
              ← 返回首页
            </Link>
          </div>
        </div>

        {/* 课程切换 — 显示本租户的课程 */}
        {COURSES.length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-gray-600 mb-2">切换课程:</p>
            <div className="flex flex-wrap gap-2">
              {COURSES.map((c) => (
                <Link
                  key={c.id}
                  href={`/leaderboard?course=${c.id}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    c.id === courseId
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
                >
                  {c.icon} {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === currentUserId}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            实时更新中 (WebSocket + Redis Sorted Set)
          </span>
          <span>{tenant.companyName} 培训排行榜</span>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500 animate-pulse">加载排行榜...</p></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
