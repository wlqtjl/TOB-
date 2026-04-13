/**
 * Game Results Page — post-game score, stars, achievements, ranking
 *
 * Displayed after completing a level. Shows:
 * - Score breakdown (base + time bonus + combo bonus)
 * - Star rating (0-3 stars)
 * - Achievements unlocked
 * - Leaderboard position
 * - Navigation to next level or back to map
 */

'use client';

import React, { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Star,
  Trophy,
  Zap,
  Clock,
  Target,
  ArrowLeft,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { ScoringEngine } from '@skillquest/game-engine';

function ResultsContent() {
  const searchParams = useSearchParams();

  // Read results from URL search params (passed from level page)
  const courseId = searchParams.get('course') ?? '';
  const levelId = searchParams.get('level') ?? '';
  const correctCount = parseInt(searchParams.get('correct') ?? '0', 10);
  const totalCount = parseInt(searchParams.get('total') ?? '0', 10);
  const timeRemaining = parseInt(searchParams.get('timeRemaining') ?? '0', 10);
  const timeLimit = parseInt(searchParams.get('timeLimit') ?? '300', 10);
  const maxCombo = parseInt(searchParams.get('combo') ?? '0', 10);
  const nextLevelId = searchParams.get('next') ?? '';

  // Calculate score
  const result = useMemo(() => ScoringEngine.calculate({
    correctCount,
    totalCount,
    timeRemainingSec: timeRemaining,
    timeLimitSec: timeLimit,
    maxCombo,
  }), [correctCount, totalCount, timeRemaining, timeLimit, maxCombo]);

  const passed = ScoringEngine.isPassed(correctCount, totalCount);
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-base-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
            passed ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {passed ? (
              <><Trophy size={16} strokeWidth={1.5} /> 关卡通过</>
            ) : (
              <><Target size={16} strokeWidth={1.5} /> 未通关</>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-base-100">
            {passed ? '恭喜完成挑战' : '再接再厉'}
          </h1>
          <p className="mt-1 text-sm text-base-400">
            关卡 {levelId} · 正确率 {accuracy}%
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`transition-all duration-500 ${
                s <= result.stars ? 'scale-110' : 'scale-90 opacity-30'
              }`}
              style={{ animationDelay: `${s * 200}ms` }}
            >
              <Star
                size={40}
                strokeWidth={1.5}
                className={s <= result.stars ? 'text-yellow-400 fill-yellow-400' : 'text-base-600'}
              />
            </div>
          ))}
        </div>

        {/* Score Card */}
        <div className="rounded-2xl border border-base-600/30 bg-base-800/40 p-6 mb-6">
          {/* Total Score */}
          <div className="text-center mb-6">
            <p className="text-xs text-base-400 mb-1">Total Score</p>
            <p className="text-4xl font-bold text-base-100">
              {(result.baseScore + result.timeBonus + result.comboBonus).toLocaleString()}
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-base-700/40 p-3">
              <Target size={16} strokeWidth={1.5} className="mx-auto text-blue-400 mb-1" />
              <p className="text-lg font-semibold text-base-100">{result.baseScore}</p>
              <p className="text-xs text-base-400">Base Score</p>
            </div>
            <div className="rounded-xl bg-base-700/40 p-3">
              <Clock size={16} strokeWidth={1.5} className="mx-auto text-green-400 mb-1" />
              <p className="text-lg font-semibold text-base-100">+{result.timeBonus}</p>
              <p className="text-xs text-base-400">Time Bonus</p>
            </div>
            <div className="rounded-xl bg-base-700/40 p-3">
              <Zap size={16} strokeWidth={1.5} className="mx-auto text-orange-400 mb-1" />
              <p className="text-lg font-semibold text-base-100">+{result.comboBonus}</p>
              <p className="text-xs text-base-400">Combo Bonus</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-base-100 font-medium">{correctCount}/{totalCount}</p>
              <p className="text-xs text-base-400">Correct</p>
            </div>
            <div>
              <p className="text-base-100 font-medium">{maxCombo}x</p>
              <p className="text-xs text-base-400">Max Combo</p>
            </div>
            <div>
              <p className="text-base-100 font-medium">+{result.xpGained} XP</p>
              <p className="text-xs text-base-400">Experience</p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {result.achievements.length > 0 && (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6">
            <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-1.5">
              <Trophy size={14} strokeWidth={1.5} />
              Achievements Unlocked
            </h3>
            <div className="space-y-2">
              {result.achievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-base-800/40 px-3 py-2">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-base-100">{a.name}</p>
                    <p className="text-xs text-base-400">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Link
            href={courseId ? `/map?course=${courseId}` : '/map'}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-base-600/40 bg-base-800/30 px-4 py-3 text-sm text-base-300 transition hover:border-base-500 hover:text-base-100"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back to Map
          </Link>
          <Link
            href={courseId ? `/leaderboard?course=${courseId}` : '/leaderboard'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-base-600/40 bg-base-800/30 px-4 py-3 text-sm text-base-300 transition hover:border-base-500 hover:text-base-100"
          >
            <BarChart3 size={16} strokeWidth={1.5} />
            Leaderboard
          </Link>
          {nextLevelId && passed && (
            <Link
              href={`/level/${nextLevelId}?course=${courseId}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-accent/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-accent"
            >
              Next Level
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-base-900 flex items-center justify-center">
          <p className="text-base-400 animate-pulse">Calculating results...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
