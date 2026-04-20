/**
 * ComboAnnouncement — Dramatic combo tier overlay
 *
 * Full-screen overlay that fires when the player crosses a combo tier threshold.
 * Each tier has its own color palette, icon, and escalating visual intensity:
 *
 *  good (3+)       — amber, subtle scale-up
 *  great (5+)      — orange, larger scale + screen edge glow
 *  amazing (7+)    — red, full-screen pulse + shake
 *  legendary (10+) — purple→gold gradient, golden particle burst, screen shake
 *
 * Auto-dismisses after 1.5 seconds.
 */

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Star, Crown } from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ComboAnnouncementProps {
  tier: 'good' | 'great' | 'amazing' | 'legendary' | null;
  comboCount: number;
  /** Key to re-trigger animation even at same tier */
  triggerKey: number;
}

// ─── Tier configuration ──────────────────────────────────────────────────────

type TierKey = 'good' | 'great' | 'amazing' | 'legendary';

interface TierConfig {
  label: string;
  Icon: React.ElementType;
  textClass: string;
  glowColor: string;
  /** Backdrop edge glow shadow */
  edgeShadow: string;
  /** Text scale at peak of animation */
  peakScale: number;
  shake: boolean;
  pulse: boolean;
  particles: boolean;
}

const TIER_CONFIG: Record<TierKey, TierConfig> = {
  good: {
    label: 'GOOD!',
    Icon: Zap,
    textClass: 'text-amber-400',
    glowColor: 'rgba(251,191,36,0.4)',
    edgeShadow: 'none',
    peakScale: 1.2,
    shake: false,
    pulse: false,
    particles: false,
  },
  great: {
    label: 'GREAT!',
    Icon: Flame,
    textClass: 'text-orange-400',
    glowColor: 'rgba(249,115,22,0.5)',
    edgeShadow: 'inset 0 0 80px rgba(249,115,22,0.25)',
    peakScale: 1.4,
    shake: false,
    pulse: false,
    particles: false,
  },
  amazing: {
    label: 'AMAZING!',
    Icon: Star,
    textClass: 'text-red-400',
    glowColor: 'rgba(239,68,68,0.6)',
    edgeShadow: 'inset 0 0 120px rgba(239,68,68,0.3)',
    peakScale: 1.6,
    shake: true,
    pulse: true,
    particles: false,
  },
  legendary: {
    label: 'LEGENDARY!',
    Icon: Crown,
    textClass: 'bg-gradient-to-r from-purple-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent',
    glowColor: 'rgba(250,204,21,0.7)',
    edgeShadow: 'inset 0 0 160px rgba(168,85,247,0.25), inset 0 0 80px rgba(250,204,21,0.2)',
    peakScale: 2.0,
    shake: true,
    pulse: true,
    particles: true,
  },
};

// ─── Particle generation (legendary only) ────────────────────────────────────

const PARTICLE_COUNT = 20;
const GOLDEN_COLORS = ['#FACC15', '#FBBF24', '#F59E0B', '#EAB308', '#A78BFA', '#F472B6'];

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 120 + Math.random() * 200;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 8,
      color: GOLDEN_COLORS[i % GOLDEN_COLORS.length],
      delay: Math.random() * 0.25,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComboAnnouncement({
  tier,
  comboCount,
  triggerKey,
}: ComboAnnouncementProps) {
  const [dismissedKey, setDismissedKey] = useState(-1);
  const particles = useMemo(() => generateParticles(), []);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visible when we have a tier and haven't dismissed this specific triggerKey
  const visible = tier !== null && dismissedKey !== triggerKey;

  // Auto-dismiss after 1.5s — start timer when visibility changes
  const prevVisibleRef = useRef(false);
  if (visible && !prevVisibleRef.current) {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setDismissedKey(triggerKey), 1500);
  }
  prevVisibleRef.current = visible;

  const config = tier ? TIER_CONFIG[tier] : null;

  return (
    <AnimatePresence>
      {visible && config && (
        <motion.div
          key={`combo-${triggerKey}`}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Screen edge glow ──────────────────────────────────────── */}
          {config.edgeShadow !== 'none' && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ boxShadow: config.edgeShadow }}
            />
          )}

          {/* ── Full-screen pulse (amazing / legendary) ───────────────── */}
          {config.pulse && (
            <motion.div
              className="absolute inset-0 rounded-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 0.6, times: [0, 0.3, 1] }}
              style={{ backgroundColor: config.glowColor }}
            />
          )}

          {/* ── Golden particle burst (legendary) ─────────────────────── */}
          {config.particles && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{ width: p.size, height: p.size, backgroundColor: p.color }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.8 + p.delay, delay: p.delay, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          {/* ── Center content (shake wrapper) ────────────────────────── */}
          <motion.div
            className="flex flex-col items-center gap-3"
            animate={
              config.shake
                ? { x: [0, -6, 6, -4, 4, -2, 2, 0] }
                : {}
            }
            transition={
              config.shake
                ? { duration: 0.5, ease: 'easeInOut' }
                : {}
            }
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            >
              <config.Icon
                size={48}
                className={tier === 'legendary' ? 'text-yellow-400' : config.textClass}
                strokeWidth={1.5}
              />
            </motion.div>

            {/* Tier label */}
            <motion.h1
              className={`text-5xl font-black tracking-wider ${config.textClass}`}
              style={{
                textShadow: `0 0 24px ${config.glowColor}, 0 0 48px ${config.glowColor}`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, config.peakScale, 1],
                opacity: [0, 1, 1],
              }}
              transition={{
                duration: 0.6,
                times: [0, 0.4, 1],
                type: 'spring',
                damping: 20,
                stiffness: 300,
              }}
            >
              {config.label}
            </motion.h1>

            {/* Combo count */}
            <motion.div
              className="flex items-center gap-2 rounded-full border border-white/20 bg-gray-900/80 backdrop-blur-xl px-5 py-1.5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
            >
              <Zap size={16} className="text-yellow-400" strokeWidth={1.5} />
              <span className="text-xl font-bold text-white">
                {comboCount}
                <span className="ml-1 text-sm font-medium text-gray-400">combo</span>
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
