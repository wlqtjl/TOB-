/**
 * GameHUD — Head-Up Display overlay for game sessions
 *
 * Shows: score, combo counter, timer, progress bar, level info.
 * Renders as an HTML overlay above the Canvas.
 */

'use client';

import React from 'react';
import type { GameState } from './hooks/useGameState';
import { getComboTier } from './FeedbackEffects';

interface Props {
  gameState: GameState;
  levelTitle?: string;
  /** Optional time limit in seconds; 0 = no limit */
  timeLimitSec?: number;
}

const COMBO_TIER_COLORS: Record<string, string> = {
  good: 'text-yellow-400 border-yellow-500 bg-yellow-500/10',
  great: 'text-orange-400 border-orange-500 bg-orange-500/10',
  amazing: 'text-red-400 border-red-500 bg-red-500/10',
  legendary: 'text-purple-400 border-purple-500 bg-purple-500/10 animate-pulse',
};

const COMBO_TIER_LABELS: Record<string, string> = {
  good: '🔥 Good!',
  great: '⚡ Great!',
  amazing: '💥 Amazing!',
  legendary: '🌟 LEGENDARY!',
};

export default function GameHUD({ gameState, levelTitle, timeLimitSec = 0 }: Props) {
  const { currentIndex, totalQuestions, totalScore, combo, stars, isComplete } = gameState;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const elapsedSec = Math.floor((Date.now() - gameState.startTime) / 1000);
  const remainingSec = timeLimitSec > 0 ? Math.max(0, timeLimitSec - elapsedSec) : null;

  const tier = getComboTier(combo.current);
  const tierStyle = tier ? COMBO_TIER_COLORS[tier] : '';
  const tierLabel = tier ? COMBO_TIER_LABELS[tier] : '';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
      {/* Top bar */}
      <div className="pointer-events-auto flex items-center justify-between rounded-lg bg-gray-900/80 px-4 py-2 backdrop-blur-sm border border-gray-800">
        {/* Left: level info */}
        <div className="flex items-center gap-3">
          {levelTitle && (
            <span className="text-sm font-medium text-blue-300 truncate max-w-[200px]">
              {levelTitle}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Center: combo */}
        <div className="flex items-center gap-2">
          {combo.current >= 3 && (
            <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${tierStyle}`}>
              {tierLabel} {combo.current}x
            </span>
          )}
          {combo.multiplier > 1 && (
            <span className="text-xs text-amber-400 font-mono">
              ×{combo.multiplier.toFixed(1)}
            </span>
          )}
        </div>

        {/* Right: score + timer */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-300 font-mono">
            💯 {totalScore}
          </span>
          <span className="text-yellow-400">
            {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
          </span>
          {remainingSec !== null && (
            <span className={`font-mono ${remainingSec < 10 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
              ⏱ {Math.floor(remainingSec / 60)}:{(remainingSec % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-yellow-400 transition-all duration-500"
          style={{ width: `${isComplete ? 100 : progress}%` }}
        />
      </div>
    </div>
  );
}
