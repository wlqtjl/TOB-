/**
 * BossVictory — full-screen victory/defeat overlay for Boss levels
 *
 * Shows the result of a POST to `/gamification/levels/:levelId/boss-complete`.
 * Features:
 * - Large grade letter (S/A/B/C) with tier-specific glow
 * - Rank score delta and XP delta
 * - `RankBadge` of the new rank, plus a "晋升!" badge when `promoted=true`
 * - Achievement ribbon when `achievementUnlocked`
 * - Dismiss button — caller owns visibility state
 *
 * Pure presentational: accepts the API response + an onDismiss. No fetching
 * inside — the boss screen should call `submitBossComplete()` and hand the
 * result to this component.
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import RankBadge, { getTier } from './RankBadge';
import type { BossCompleteResponse } from '../../lib/api-client';

export interface BossVictoryProps {
  visible: boolean;
  result: BossCompleteResponse | null;
  onDismiss: () => void;
  /** Current rankScore (used to size the stars inside the rank badge). */
  rankScore?: number;
}

const GRADE_STYLE: Record<
  BossCompleteResponse['grade'],
  { color: string; glow: string; label: string }
> = {
  S: { color: 'text-yellow-300',  glow: 'rgba(250,204,21,0.75)',  label: '完美通关' },
  A: { color: 'text-emerald-300', glow: 'rgba(52,211,153,0.7)',   label: '出色完成' },
  B: { color: 'text-cyan-300',    glow: 'rgba(103,232,249,0.6)',  label: '顺利通关' },
  C: { color: 'text-gray-300',    glow: 'rgba(156,163,175,0.55)', label: '险胜一局' },
};

export default function BossVictory({
  visible,
  result,
  onDismiss,
  rankScore = 0,
}: BossVictoryProps) {
  const grade = useMemo(
    () => (result ? GRADE_STYLE[result.grade] : null),
    [result],
  );
  // RankBadge.getTier accepts both upper and lower case — pass the backend
  // enum value (uppercase) through directly.
  const newTier = useMemo(
    () => (result ? getTier(result.newRank) : null),
    [result],
  );
  const previousTier = useMemo(
    () => (result ? getTier(result.previousRank) : null),
    [result],
  );

  return (
    <AnimatePresence>
      {visible && result && grade && (
        <motion.div
          key="boss-victory"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 240 }}
            className="relative mx-4 w-full max-w-md rounded-3xl border border-gray-700/60 bg-gray-900/95 p-8"
            style={{ boxShadow: `0 0 80px ${grade.glow}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Trophy header */}
            <div className="mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-gray-400">
              <Trophy size={14} className="text-yellow-400" />
              Boss 结算
            </div>

            {/* Grade */}
            <motion.div
              className={`mb-1 text-center text-[120px] font-black leading-none ${grade.color}`}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 220 }}
              style={{ textShadow: `0 0 40px ${grade.glow}` }}
            >
              {result.grade}
            </motion.div>
            <p className="mb-6 text-center text-sm font-semibold text-gray-300">
              {grade.label}
            </p>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Stat label="星数" value={`${result.stars}/3`} icon="⭐" />
              <Stat label="段位分" value={`+${result.rankDelta}`} icon="📈" accent />
              <Stat label="经验" value={`+${result.xpDelta}`} icon="✨" />
            </div>

            {/* Rank section */}
            <div className="mb-6 rounded-2xl border border-gray-700/40 bg-gray-800/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">当前段位</span>
                {result.promoted && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring', damping: 14 }}
                    className="flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300"
                  >
                    <TrendingUp size={10} />
                    晋升
                  </motion.span>
                )}
              </div>
              <div className="flex items-center justify-center gap-3">
                {result.promoted && previousTier && (
                  <>
                    <span className="text-sm text-gray-500">{previousTier.name}</span>
                    <ArrowRight size={14} className="text-gray-600" />
                  </>
                )}
                <RankBadge rank={newTier!.id} rankScore={rankScore} size="md" />
              </div>
            </div>

            {/* Achievement */}
            {result.achievementUnlocked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-5 flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-sm text-purple-200"
              >
                <Sparkles size={16} className="text-purple-300" />
                解锁新成就！
              </motion.div>
            )}

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="w-full rounded-xl border border-gray-600 bg-gray-800 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
              type="button"
            >
              继续
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 text-center ${
        accent
          ? 'border-yellow-400/30 bg-yellow-500/10'
          : 'border-gray-700/40 bg-gray-800/40'
      }`}
    >
      <div className="text-lg leading-none">{icon}</div>
      <div
        className={`mt-1 text-base font-bold ${
          accent ? 'text-yellow-300' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
