/**
 * RankBadge — Player rank tier badge with glow effects
 *
 * Displays the player's current competitive rank tier based on XP.
 * Seven tiers from Bronze (青铜) to Legend (传说), each with
 * distinct color, icon, and glow treatment.
 *
 * Exports:
 * - getRank(xp)    — returns the RankTier object for a given XP value
 * - RANK_TIERS     — ordered array of all tier definitions
 * - RankTier type  — tier shape
 * - RankBadge      — default component
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, Gem, Sparkles, Flame, Star } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RankTier {
  id: string;
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  glowColor: string;
  iconName: 'Shield' | 'Crown' | 'Gem' | 'Sparkles' | 'Flame';
}

export interface RankBadgeProps {
  xp: number;
  showStars?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ─── Tier definitions ────────────────────────────────────────────────────────

export const RANK_TIERS: RankTier[] = [
  { id: 'bronze',   name: '青铜', minXp: 0,     maxXp: 999,      color: 'amber-600',   glowColor: 'rgba(217,119,6,0.6)',   iconName: 'Shield'   },
  { id: 'silver',   name: '白银', minXp: 1000,   maxXp: 2999,    color: 'gray-400',    glowColor: 'rgba(156,163,175,0.6)', iconName: 'Shield'   },
  { id: 'gold',     name: '黄金', minXp: 3000,   maxXp: 5999,    color: 'yellow-400',  glowColor: 'rgba(250,204,21,0.6)',  iconName: 'Crown'    },
  { id: 'platinum', name: '铂金', minXp: 6000,   maxXp: 9999,    color: 'cyan-400',    glowColor: 'rgba(34,211,238,0.6)',  iconName: 'Crown'    },
  { id: 'diamond',  name: '钻石', minXp: 10000,  maxXp: 14999,   color: 'blue-400',    glowColor: 'rgba(96,165,250,0.6)',  iconName: 'Gem'      },
  { id: 'star',     name: '星耀', minXp: 15000,  maxXp: 19999,   color: 'purple-400',  glowColor: 'rgba(192,132,252,0.6)', iconName: 'Sparkles' },
  { id: 'legend',   name: '传说', minXp: 20000,  maxXp: Infinity, color: 'red-400',    glowColor: 'rgba(248,113,113,0.6)', iconName: 'Flame'    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICON_MAP = { Shield, Crown, Gem, Sparkles, Flame } as const;

/** Returns the RankTier matching a given XP total. */
export function getRank(xp: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (xp >= RANK_TIERS[i].minXp) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

/** How many stars (1-5) the player has earned within the current tier. */
function getStarsInTier(xp: number, tier: RankTier): number {
  const range = tier.maxXp === Infinity ? 10000 : tier.maxXp - tier.minXp + 1;
  const progress = xp - tier.minXp;
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

export default function RankBadge({ xp, showStars = true, size = 'md' }: RankBadgeProps) {
  const rank = useMemo(() => getRank(xp), [xp]);
  const stars = useMemo(() => getStarsInTier(xp, rank), [xp, rank]);
  const cfg = SIZE_CONFIG[size];
  const Icon = ICON_MAP[rank.iconName];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`inline-flex items-center ${cfg.gap} ${cfg.padding} rounded-full border border-${rank.color}/30 bg-gray-900/80 backdrop-blur-xl`}
      style={{ boxShadow: `0 0 14px ${rank.glowColor}, 0 0 4px ${rank.glowColor}` }}
    >
      {/* Rank icon */}
      <motion.div
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Icon size={cfg.icon} className={`text-${rank.color}`} />
      </motion.div>

      {/* Rank name */}
      <span className={`${cfg.text} font-bold text-${rank.color}`}>
        {rank.name}
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
                    ? `text-${rank.color} fill-${rank.color}`
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
