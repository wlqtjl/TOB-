/**
 * RankPromotionOverlay — Full-screen rank-up celebration
 *
 * Dramatic cinematic sequence when the player promotes to a new rank tier:
 * 1. Dark overlay fades in
 * 2. Old rank badge scales down and fades
 * 3. Particle burst (motion.div pseudo-particles)
 * 4. New rank badge scales up with spring bounce
 * 5. Rank name appears with typewriter delay
 * 6. "段位晋升!" heading with golden glow
 *
 * Auto-dismisses after 4 seconds OR on click.
 * Plays ascending chord via Web Audio API (matches VictoryEffects pattern).
 */

'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crown, Gem, Sparkles, Flame, Star } from 'lucide-react';
import type { RankTier } from './RankBadge';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RankPromotionOverlayProps {
  visible: boolean;
  oldRank: RankTier;
  newRank: RankTier;
  onDismiss: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICON_MAP = { Shield, Crown, Gem, Sparkles, Flame } as const;

/** Pre-computed Tailwind class mappings (JIT-safe — no dynamic interpolation). */
const RANK_CLASSES: Record<string, { border: string; borderWide: string; text: string; fill: string }> = {
  iron:     { border: 'border-zinc-500/30',   borderWide: 'border-zinc-500/40',   text: 'text-zinc-300',   fill: 'fill-zinc-300'   },
  bronze:   { border: 'border-amber-600/30',  borderWide: 'border-amber-600/40',  text: 'text-amber-600',  fill: 'fill-amber-600'  },
  silver:   { border: 'border-gray-400/30',   borderWide: 'border-gray-400/40',   text: 'text-gray-400',   fill: 'fill-gray-400'   },
  gold:     { border: 'border-yellow-400/30', borderWide: 'border-yellow-400/40', text: 'text-yellow-400', fill: 'fill-yellow-400' },
  platinum: { border: 'border-cyan-400/30',   borderWide: 'border-cyan-400/40',   text: 'text-cyan-400',   fill: 'fill-cyan-400'   },
  diamond:  { border: 'border-blue-400/30',   borderWide: 'border-blue-400/40',   text: 'text-blue-400',   fill: 'fill-blue-400'   },
  legend:   { border: 'border-red-400/30',    borderWide: 'border-red-400/40',    text: 'text-red-400',    fill: 'fill-red-400'    },
};

const PARTICLE_COUNT = 24;
const PARTICLE_COLORS = [
  '#FBBF24', '#F59E0B', '#EF4444', '#A78BFA',
  '#34D399', '#60A5FA', '#F472B6', '#FACC15',
];

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const distance = 100 + Math.random() * 160;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 8,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: Math.random() * 0.3,
    };
  });
}

/** Ascending promotion chord via Web Audio API. */
function playPromotionSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Ascending chord: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.9);
    });

    // Final shimmer
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    }, 500);
  } catch {
    // Web Audio not available — silent fallback
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RankPromotionOverlay({
  visible,
  oldRank,
  newRank,
  onDismiss,
}: RankPromotionOverlayProps) {
  const [phase, setPhase] = useState<'idle' | 'old' | 'burst' | 'new' | 'text'>('idle');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const particles = useMemo(() => generateParticles(), []);

  const OldIcon = ICON_MAP[oldRank.iconName];
  const NewIcon = ICON_MAP[newRank.iconName];
  const oldCls = RANK_CLASSES[oldRank.id];
  const newCls = RANK_CLASSES[newRank.id];

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  // Sequenced animation phases
  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setPhase('idle'), 0);
      return () => clearTimeout(t);
    }

    playPromotionSound();

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
    };

    schedule(() => setPhase('old'), 0);
    schedule(() => setPhase('burst'), 600);
    schedule(() => setPhase('new'), 1000);
    schedule(() => setPhase('text'), 1500);
    schedule(() => onDismiss(), 4000);

    return clearTimers;
  }, [visible, onDismiss, clearTimers]);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark backdrop */}
      <motion.div
        className="absolute inset-0 bg-gray-950/90 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col items-center">

        {/* ── Heading: 段位晋升! ─────────────────────────────────────────── */}
        <AnimatePresence>
          {(phase === 'text') && (
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="mb-8 text-3xl font-extrabold tracking-widest text-amber-400"
              style={{ textShadow: '0 0 24px rgba(251,191,36,0.6), 0 0 48px rgba(251,191,36,0.3)' }}
            >
              段位晋升!
            </motion.h1>
          )}
        </AnimatePresence>

        {/* ── Old rank badge (scales down → fades) ───────────────────────── */}
        <AnimatePresence>
          {(phase === 'old') && (
            <motion.div
              key="old-rank"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0.3, scale: 0.6 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.5, ease: 'easeIn' }}
              className="flex flex-col items-center"
            >
              <div
                className={`rounded-full border ${oldCls.border} bg-gray-900/80 p-6`}
                style={{ boxShadow: `0 0 20px ${oldRank.glowColor}` }}
              >
                <OldIcon size={48} className={oldCls.text} />
              </div>
              <span className={`mt-3 text-lg font-bold ${oldCls.text}`}>
                {oldRank.name}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Particle burst ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {(phase === 'burst' || phase === 'new' || phase === 'text') && (
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
        </AnimatePresence>

        {/* ── New rank badge (scales up with spring) ──────────────────────── */}
        <AnimatePresence>
          {(phase === 'new' || phase === 'text') && (
            <motion.div
              key="new-rank"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className={`rounded-full border-2 ${newCls.borderWide} bg-gray-900/90 p-8`}
                style={{ boxShadow: `0 0 30px ${newRank.glowColor}, 0 0 60px ${newRank.glowColor}` }}
                animate={{
                  boxShadow: [
                    `0 0 30px ${newRank.glowColor}, 0 0 60px ${newRank.glowColor}`,
                    `0 0 40px ${newRank.glowColor}, 0 0 80px ${newRank.glowColor}`,
                    `0 0 30px ${newRank.glowColor}, 0 0 60px ${newRank.glowColor}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <NewIcon size={56} className={newCls.text} />
                </motion.div>
              </motion.div>

              {/* Rank name with typewriter delay */}
              <AnimatePresence>
                {phase === 'text' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="mt-4 flex flex-col items-center gap-2"
                  >
                    <span
                      className={`text-2xl font-extrabold ${newCls.text}`}
                      style={{ textShadow: `0 0 16px ${newRank.glowColor}` }}
                    >
                      {newRank.name.split('').map((char, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.12 }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </span>

                    {/* Five stars for max tier display */}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.8 + i * 0.1, type: 'spring', damping: 16 }}
                        >
                          <Star
                            size={18}
                            className={`${newCls.text} ${newCls.fill}`}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dismiss hint ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === 'text' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.5 }}
              className="mt-10 text-xs text-gray-500"
            >
              点击任意位置关闭
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
