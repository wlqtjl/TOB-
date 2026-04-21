/**
 * RankBadge — Player rank tier badge with glow effects
 *
 * Displays the player's current competitive rank tier. Seven tiers keyed on
 * the backend `PlayerRank` enum: IRON → BRONZE → SILVER → GOLD → PLATINUM →
 * DIAMOND → LEGEND. Thresholds match `RankService.RANK_THRESHOLDS` in
 * apps/api (rankScore-based, not XP).
 *
 * Exports:
 * - RANK_TIERS            — ordered array, indexed by PlayerRankKey
 * - getRankFromScore(n)   — returns the RankTier for a given rankScore
 * - getTier(rank)         — returns the RankTier for a PlayerRankKey
 * - RankTier / PlayerRankKey types
 * - RankBadge             — default component
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, Gem, Flame, Star } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlayerRankKey =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legend';

export interface RankTier {
  id: PlayerRankKey;
  name: string;
  /** Inclusive lower bound for rankScore */
  minScore: number;
  /** Inclusive upper bound for rankScore (Infinity for legend) */
  maxScore: number;
  glowColor: string;
  iconName: 'Shield' | 'Crown' | 'Gem' | 'Flame';
}

export interface RankBadgeProps {
  /** Explicit tier — preferred when available (backend enum value, case-insensitive). */
  rank?: PlayerRankKey | Uppercase<PlayerRankKey>;
  /**
   * Rank score from backend (0-∞). Used to derive the tier when `rank` is
   * omitted, and to compute the 5-star progress indicator within the tier.
   */
  rankScore?: number;
  showStars?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ─── Tier definitions — must match apps/api/.../rank.service.ts thresholds ──

export const RANK_TIERS: RankTier[] = [
  { id: 'iron',     name: '玄铁', minScore: 0,    maxScore: 199,      glowColor: 'rgba(113,113,122,0.6)', iconName: 'Shield' },
  { id: 'bronze',   name: '青铜', minScore: 200,  maxScore: 499,      glowColor: 'rgba(217,119,6,0.6)',   iconName: 'Shield' },
  { id: 'silver',   name: '白银', minScore: 500,  maxScore: 999,      glowColor: 'rgba(156,163,175,0.6)', iconName: 'Shield' },
  { id: 'gold',     name: '黄金', minScore: 1000, maxScore: 1799,     glowColor: 'rgba(250,204,21,0.6)',  iconName: 'Crown'  },
  { id: 'platinum', name: '铂金', minScore: 1800, maxScore: 2999,     glowColor: 'rgba(34,211,238,0.6)',  iconName: 'Crown'  },
  { id: 'diamond',  name: '钻石', minScore: 3000, maxScore: 4999,     glowColor: 'rgba(96,165,250,0.6)',  iconName: 'Gem'    },
  { id: 'legend',   name: '传说', minScore: 5000, maxScore: Infinity, glowColor: 'rgba(248,113,113,0.6)', iconName: 'Flame'  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICON_MAP = { Shield, Crown, Gem, Flame } as const;

/** Pre-computed Tailwind class mappings (JIT-safe — no dynamic interpolation). */
const RANK_CLASSES: Record<PlayerRankKey, { border: string; text: string; fill: string }> = {
  iron:     { border: 'border-zinc-500/30',   text: 'text-zinc-300',   fill: 'fill-zinc-300'   },
  bronze:   { border: 'border-amber-600/30',  text: 'text-amber-600',  fill: 'fill-amber-600'  },
  silver:   { border: 'border-gray-400/30',   text: 'text-gray-400',   fill: 'fill-gray-400'   },
  gold:     { border: 'border-yellow-400/30', text: 'text-yellow-400', fill: 'fill-yellow-400' },
  platinum: { border: 'border-cyan-400/30',   text: 'text-cyan-400',   fill: 'fill-cyan-400'   },
  diamond:  { border: 'border-blue-400/30',   text: 'text-blue-400',   fill: 'fill-blue-400'   },
  legend:   { border: 'border-red-400/30',    text: 'text-red-400',    fill: 'fill-red-400'    },
};

function normalizeKey(key: string): PlayerRankKey {
  const lower = key.toLowerCase();
  return (RANK_TIERS.find((t) => t.id === lower)?.id) ?? 'iron';
}

/** Returns the RankTier matching a rankScore. */
export function getRankFromScore(rankScore: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (rankScore >= RANK_TIERS[i].minScore) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

/** Returns the RankTier for a PlayerRank enum key (accepts upper/lower case). */
export function getTier(rank: PlayerRankKey | Uppercase<PlayerRankKey>): RankTier {
  return RANK_TIERS.find((t) => t.id === normalizeKey(rank)) ?? RANK_TIERS[0];
}

/** How many stars (1-5) the player has earned within the current tier. */
function getStarsInTier(rankScore: number, tier: RankTier): number {
  const range =
    tier.maxScore === Infinity ? 2000 : tier.maxScore - tier.minScore + 1;
  const progress = rankScore - tier.minScore;
  const raw = Math.floor((progress / range) * 5) + 1;
  return Math.max(1, Math.min(5, raw));
}

// ─── Size presets ────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { icon: 16, star: 10, text: 'text-xs',  padding: 'px-2 py-1',   gap: 'gap-1'   },
  md: { icon: 22, star: 14, text: 'text-sm',  padding: 'px-3 py-1.5', gap: 'gap-1.5' },
  lg: { icon: 30, star: 18, text: 'text-base', padding: 'px-4 py-2',  gap: 'gap-2'   },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function RankBadge({
  rank,
  rankScore = 0,
  showStars = true,
  size = 'md',
}: RankBadgeProps) {
  const tier = useMemo(
    () => (rank ? getTier(rank) : getRankFromScore(rankScore)),
    [rank, rankScore],
  );
  const stars = useMemo(
    () => getStarsInTier(rankScore, tier),
    [rankScore, tier],
  );
  const cfg = SIZE_CONFIG[size];
  const Icon = ICON_MAP[tier.iconName];
  const cls = RANK_CLASSES[tier.id];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`inline-flex items-center ${cfg.gap} ${cfg.padding} rounded-full border ${cls.border} bg-gray-900/80 backdrop-blur-xl`}
      style={{ boxShadow: `0 0 14px ${tier.glowColor}, 0 0 4px ${tier.glowColor}` }}
    >
      {/* Rank icon */}
      <motion.div
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Icon size={cfg.icon} className={cls.text} />
      </motion.div>

      {/* Rank name */}
      <span className={`${cfg.text} font-bold ${cls.text}`}>
        {tier.name}
      </span>

      {/* Stars within tier */}
      {showStars && (
        <span className={`inline-flex items-center ${cfg.gap}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: i < stars ? 1 : 0.5, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', damping: 18 }}
            >
              <Star
                size={cfg.star}
                className={
                  i < stars
                    ? `${cls.text} ${cls.fill}`
                    : 'text-gray-600'
                }
              />
            </motion.div>
          ))}
        </span>
      )}
    </motion.div>
  );
}
