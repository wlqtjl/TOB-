/**
 * Daily Quests Page — /daily
 *
 * Showcases the gamification stack:
 * - API-backed `RankBadge` (live `RankSummary`)
 * - API-backed `ApiDailyQuest` (3-question daily quest)
 * - `RankLeaderboard` (tenant ladder)
 * - `TutorBubble` demo (POSTs synthetic performance to AI tutor)
 * - Legacy localStorage `DailyQuests` engagement card kept below for
 *   in-game hooks that call `completeDailyQuest()`.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

import DailyQuests, { completeDailyQuest } from '../../components/game/DailyQuests';
import ApiDailyQuest from '../../components/game/ApiDailyQuest';
import RankBadge, { type PlayerRankKey } from '../../components/game/RankBadge';
import RankLeaderboard from '../../components/game/RankLeaderboard';
import TutorBubble from '../../components/game/TutorBubble';

import { fetchRank, type RankSummary, type TutorFeedbackRequest } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';

export default function DailyPage() {
  const { user } = useAuth();
  const [rank, setRank] = useState<RankSummary | null>(null);
  const [tutorPerf, setTutorPerf] = useState<TutorFeedbackRequest | null>(null);
  const [demoLevelId, setDemoLevelId] = useState<string>('huawei-l8');

  const reloadRank = useCallback(async () => {
    setRank(await fetchRank());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void reloadRank(), 0);
    return () => clearTimeout(t);
  }, [reloadRank]);

  const triggerTutor = (correct: number, total: number) => {
    // Force a fresh request even if the same numbers were used last time
    setTutorPerf({ correct, total, durationSec: 90 });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            <ArrowLeft size={14} /> 返回
          </Link>
          {rank ? (
            <RankBadge
              rank={rank.rank.toLowerCase() as PlayerRankKey}
              rankScore={rank.rankScore}
              size="sm"
            />
          ) : (
            <RankBadge rank="iron" rankScore={0} size="sm" />
          )}
        </div>

        {/* API-backed Daily Quest (3 levels) */}
        <ApiDailyQuest onCompleted={() => void reloadRank()} />

        {/* Rank summary text */}
        {rank && (
          <div className="mt-4 rounded-xl border border-gray-700/50 bg-gray-900/60 p-3 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>段位分: <span className="font-bold text-white">{rank.rankScore.toLocaleString()}</span></span>
              {rank.toNext !== null ? (
                <span>距下一段 <span className="text-indigo-300">{rank.toNext.toLocaleString()}</span></span>
              ) : (
                <span className="text-yellow-300">已达最高段位</span>
              )}
            </div>
          </div>
        )}

        {/* Legacy local engagement quests (cross-component public API) */}
        <div className="mt-6">
          <DailyQuests
            onClaimReward={(type, xp) => {
              // In production, also push to backend analytics.
              console.log(`Claimed ${type} quest reward: +${xp} XP`);
            }}
          />
        </div>

        {/* Demo controls */}
        <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-900/60 p-4">
          <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
            <Zap size={14} className="text-yellow-400" />
            测试控制台
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: '完成冲刺', type: 'sprint' as const },
              { label: '+1 连击', type: 'combo' as const },
              { label: '+1 星', type: 'stars' as const },
              { label: '+1 关卡', type: 'levels' as const },
            ].map((btn) => (
              <button
                key={btn.type}
                onClick={() => completeDailyQuest(btn.type)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:border-gray-500 transition"
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={demoLevelId}
              onChange={(e) => setDemoLevelId(e.target.value)}
              placeholder="levelId"
              className="flex-1 min-w-[120px] rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 placeholder-gray-500"
            />
            <button
              onClick={() => triggerTutor(8, 10)}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 transition"
              type="button"
            >
              请求好评 (8/10)
            </button>
            <button
              onClick={() => triggerTutor(4, 10)}
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300 hover:bg-orange-500/20 transition"
              type="button"
            >
              请求差评 (4/10)
            </button>
          </div>
        </div>

        {/* Tutor bubble */}
        {tutorPerf && (
          <div className="mt-4">
            <TutorBubble levelId={demoLevelId} performance={tutorPerf} />
          </div>
        )}

        {/* Rank leaderboard */}
        <div className="mt-6">
          <RankLeaderboard limit={20} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
