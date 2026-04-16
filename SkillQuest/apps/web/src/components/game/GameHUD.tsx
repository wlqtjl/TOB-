/**
 * GameHUD — Minimalist Head-Up Display
 *
 * Frosted glass overlay, Lucide icons, clean typography
 */

'use client';

import React from 'react';
import { Star, Clock, Zap } from 'lucide-react';
import type { GameState } from './hooks/useGameState';
import { getComboTier } from './FeedbackEffects';

interface Props {
  gameState: GameState;
  levelTitle?: string;
  timeLimitSec?: number;
}

const COMBO_TIER_STYLES: Record<string, string> = {
  good: 'text-amber-600 border-yellow-500/30 bg-amber-50',
  great: 'text-orange-600 border-orange-500/30 bg-orange-500/5',
  amazing: 'text-red-600 border-red-200 bg-red-50',
  legendary: 'text-purple-600 border-purple-500/30 bg-purple-500/5 animate-pulse',
};

const COMBO_TIER_LABELS: Record<string, string> = {
  good: 'Good!',
  great: 'Great!',
  amazing: 'Amazing!',
  legendary: 'LEGENDARY!',
};

export default function GameHUD({ gameState, levelTitle, timeLimitSec = 0 }: Props) {
  const { currentIndex, totalQuestions, totalScore, combo, stars, isComplete } = gameState;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const elapsedSec = Math.floor((Date.now() - gameState.startTime) / 1000);
  const remainingSec = timeLimitSec > 0 ? Math.max(0, timeLimitSec - elapsedSec) : null;

  const tier = getComboTier(combo.current);
  const tierStyle = tier ? COMBO_TIER_STYLES[tier] : '';
  const tierLabel = tier ? COMBO_TIER_LABELS[tier] : '';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
      {/* Top bar — frosted glass */}
      <div className="pointer-events-auto glass flex items-center justify-between rounded-xl px-4 py-2.5">
        {/* Left: level info */}
        <div className="flex items-center gap-3">
          {levelTitle && (
            <span className="text-sm font-medium text-base-900 truncate max-w-[200px]">
              {levelTitle}
            </span>
          )}
          <span className="text-xs text-base-400 font-mono">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Center: combo */}
        <div className="flex items-center gap-2">
          {combo.current >= 3 && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${tierStyle}`}>
              <Zap size={12} strokeWidth={1.5} />
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
          <span className="text-accent font-mono font-medium">
            {totalScore}
          </span>
          <span className="flex items-center gap-0.5 text-base-600">
            {Array.from({ length: 3 }, (_, i) => (
              <Star
                key={i}
                size={14}
                strokeWidth={1.5}
                className={i < stars ? 'fill-yellow-400 text-amber-600' : 'text-base-600'}
              />
            ))}
          </span>
          {remainingSec !== null && (
            <span className={`flex items-center gap-1 font-mono text-xs ${remainingSec < 10 ? 'text-red-600 animate-pulse' : 'text-base-400'}`}>
              <Clock size={12} strokeWidth={1.5} />
              {Math.floor(remainingSec / 60)}:{(remainingSec % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-[2px] rounded-full bg-base-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent/60 transition-all duration-500"
          style={{ width: `${isComplete ? 100 : progress}%` }}
        />
      </div>
    </div>
  );
}
