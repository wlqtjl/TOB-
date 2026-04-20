/**
 * BossHealthBar — Cinematic boss HP bar with multi-phase battle support
 *
 * Features:
 * 1. Animated HP depletion (framer-motion spring)
 * 2. Multi-phase transitions with screen flash + color shift
 * 3. Floating damage numbers on each hit
 * 4. Pulsing glow at low HP (< 30%)
 * 5. "DEFEATED" explosion animation when HP reaches 0
 */

'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Shield, Skull, Swords } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface BossPhase {
  name: string;
  hpThreshold: number;
  color: string;
  icon: string;
}

export interface BossHealthBarProps {
  bossName: string;
  totalHp: number;
  currentHp: number;
  phases: BossPhase[];
  lastDamage?: { amount: number; timestamp: number };
  defeated?: boolean;
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface FloatingDamage {
  id: number;
  amount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveCurrentPhase(hpPercent: number, phases: BossPhase[]): BossPhase | null {
  // Phases are checked from lowest threshold upward;
  // the first phase whose threshold is >= current hp% is the active one.
  const sorted = [...phases].sort((a, b) => a.hpThreshold - b.hpThreshold);
  for (const phase of sorted) {
    if (hpPercent <= phase.hpThreshold) return phase;
  }
  return sorted[sorted.length - 1] ?? null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BossHealthBar({
  bossName,
  totalHp,
  currentHp,
  phases,
  lastDamage,
  defeated = false,
}: BossHealthBarProps) {
  const hpPercent = totalHp > 0 ? Math.max(0, Math.min(1, currentHp / totalHp)) : 0;
  const isLowHp = hpPercent > 0 && hpPercent < 0.3;

  // ── Animated HP bar width ──────────────────────────────────────────────────
  const hpMotion = useMotionValue(hpPercent);
  const hpSpring = useSpring(hpMotion, { damping: 30, stiffness: 200 });
  const hpWidth = useTransform(hpSpring, (v: number) => `${(v * 100).toFixed(2)}%`);

  useEffect(() => {
    hpMotion.set(hpPercent);
  }, [hpPercent, hpMotion]);

  // ── Phase tracking ─────────────────────────────────────────────────────────
  const activePhase = useMemo(() => resolveCurrentPhase(hpPercent, phases), [hpPercent, phases]);
  const prevPhaseRef = useRef<BossPhase | null>(activePhase);
  const [phaseFlash, setPhaseFlash] = useState(false);
  const [phaseKey, setPhaseKey] = useState(0);

  useEffect(() => {
    if (activePhase && prevPhaseRef.current && activePhase.name !== prevPhaseRef.current.name) {
      setPhaseFlash(true);
      setPhaseKey((k) => k + 1);
      const timer = setTimeout(() => setPhaseFlash(false), 600);
      prevPhaseRef.current = activePhase;
      return () => clearTimeout(timer);
    }
    prevPhaseRef.current = activePhase;
  }, [activePhase]);

  // ── Floating damage numbers ────────────────────────────────────────────────
  const [damages, setDamages] = useState<FloatingDamage[]>([]);
  const damageIdRef = useRef(0);

  useEffect(() => {
    if (!lastDamage || lastDamage.amount <= 0) return;
    const id = ++damageIdRef.current;
    setDamages((prev) => [...prev, { id, amount: lastDamage.amount }]);
    const timer = setTimeout(() => {
      setDamages((prev) => prev.filter((d) => d.id !== id));
    }, 1200);
    return () => clearTimeout(timer);
  }, [lastDamage?.amount, lastDamage?.timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bar color gradient ─────────────────────────────────────────────────────
  const barGradient = activePhase?.color ?? 'from-red-500 to-orange-400';

  return (
    <div className="relative w-full select-none">
      {/* Phase-transition screen flash */}
      <AnimatePresence>
        {phaseFlash && (
          <motion.div
            key="phase-flash"
            className="fixed inset-0 z-50 pointer-events-none bg-amber-400/25"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* Main container — frosted glass card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="rounded-2xl border border-red-500/30 bg-gray-900/80 backdrop-blur-xl p-4 shadow-2xl"
      >
        {/* ── Top row: Boss name + Phase indicator ─────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-red-400" />
            <span className="text-base font-bold text-white tracking-wide">{bossName}</span>
          </div>

          {/* Phase indicator */}
          {activePhase && !defeated && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`phase-${phaseKey}`}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/60 px-3 py-1"
              >
                <span className="text-sm">{activePhase.icon}</span>
                <span className="text-xs font-semibold text-amber-300">{activePhase.name}</span>
              </motion.div>
            </AnimatePresence>
          )}

          {defeated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1"
            >
              <Skull size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">DEFEATED</span>
            </motion.div>
          )}
        </div>

        {/* ── HP Bar ──────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Bar track */}
          <div className="relative h-5 w-full overflow-hidden rounded-full bg-gray-800/90 border border-gray-700/50">
            {/* Animated HP fill */}
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient} ${
                isLowHp ? 'animate-pulse' : ''
              }`}
              style={{ width: hpWidth }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            />

            {/* Glow overlay for low HP */}
            {isLowHp && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ boxShadow: ['0 0 8px rgba(239,68,68,0.4)', '0 0 20px rgba(239,68,68,0.8)', '0 0 8px rgba(239,68,68,0.4)'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Phase threshold markers */}
            {phases.map((phase) => (
              <div
                key={phase.name}
                className="absolute top-0 bottom-0 w-px bg-white/20"
                style={{ left: `${phase.hpThreshold * 100}%` }}
              />
            ))}

            {/* Inner shine */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>

          {/* Floating damage numbers */}
          <div className="absolute -top-2 right-4 pointer-events-none">
            <AnimatePresence>
              {damages.map((d) => (
                <motion.span
                  key={d.id}
                  initial={{ opacity: 1, y: 0, scale: 0.6 }}
                  animate={{ opacity: 0, y: -48, scale: 1.3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="absolute right-0 text-lg font-extrabold text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                >
                  -{d.amount}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── HP text ─────────────────────────────────────────────────────── */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-400">
            <Shield size={12} />
            <span className="font-mono">
              {currentHp} / {totalHp}
            </span>
          </div>
          <span className="font-mono text-gray-500">
            {(hpPercent * 100).toFixed(1)}%
          </span>
        </div>
      </motion.div>

      {/* ── Defeated explosion overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {defeated && (
          <motion.div
            key="defeated-explosion"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Radial burst rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2 border-amber-400/40"
                initial={{ width: 0, height: 0, opacity: 0.8 }}
                animate={{ width: 300 + i * 80, height: 300 + i * 80, opacity: 0 }}
                transition={{ duration: 1 + i * 0.3, delay: i * 0.15, ease: 'easeOut' }}
              />
            ))}

            {/* Center "DEFEATED" text */}
            <motion.div
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 150, delay: 0.2 }}
              className="z-10 rounded-xl border border-emerald-400/30 bg-gray-900/90 backdrop-blur-md px-6 py-3 shadow-lg shadow-emerald-500/20"
            >
              <span className="text-xl font-extrabold tracking-widest text-emerald-400">
                🏆 DEFEATED
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
