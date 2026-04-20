/**
 * VictoryEffects — Canvas particle fireworks + celebration overlay
 *
 * Triggered on level completion for triple sensory feedback:
 * 1. Visual: Canvas particle fireworks burst
 * 2. Motion: Framer Motion scale/fade celebration card
 * 3. Haptic: Screen flash overlay
 *
 * Pure client component — no audio library dependency (uses Web Audio API).
 */

'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

interface VictoryEffectsProps {
  /** Whether to show the effects */
  visible: boolean;
  /** Star count (0-3) */
  stars: number;
  /** Score achieved */
  score: number;
  /** Callback to dismiss */
  onDismiss: () => void;
}

const FIREWORK_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

function createParticle(x: number, y: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 6;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1.5 + Math.random() * 2.5,
    color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
    life: 1,
    maxLife: 0.8 + Math.random() * 0.7,
    gravity: 0.05 + Math.random() * 0.03,
  };
}

function playVictorySound() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Victory chord: C-E-G arpeggio
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.8);
    });

    // High sparkle
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }, 450);
  } catch {
    // Web Audio not available — silent fallback
  }
}

export default function VictoryEffects({ visible, stars, score, onDismiss }: VictoryEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  // Track card visibility via ref + callback scheduling to avoid setState in effect body
  const [showCard, setShowCard] = useState(false);

  const emitFirework = useCallback((cx: number, cy: number, count: number = 50) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(cx, cy));
    }
  }, []);

  const showCardCallback = useCallback(() => setShowCard(true), []);

  // Start fireworks sequence when visible becomes true
  useEffect(() => {
    if (!visible) {
      // Use setTimeout(0) to avoid direct setState in effect body
      const t = setTimeout(() => {
        setShowCard(false);
        particlesRef.current = [];
      }, 0);
      return () => clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    playVictorySound();

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Staggered firework bursts
    const bursts = [
      { delay: 0, x: w * 0.5, y: h * 0.3 },
      { delay: 200, x: w * 0.25, y: h * 0.35 },
      { delay: 400, x: w * 0.75, y: h * 0.35 },
      { delay: 600, x: w * 0.4, y: h * 0.2 },
      { delay: 800, x: w * 0.6, y: h * 0.2 },
    ];

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    bursts.forEach(({ delay, x, y }) => {
      timeouts.push(setTimeout(() => emitFirework(x, y, 60), delay));
    });

    // Show card after initial bursts
    timeouts.push(setTimeout(showCardCallback, 1000));

    return () => { timeouts.forEach(clearTimeout); };
  }, [visible, emitFirework, showCardCallback]);

  // Animation loop
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      const dt = 1 / 60;
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.life -= dt / p.maxLife;

        if (p.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.globalAlpha = Math.max(0, p.life * 0.3);
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Screen flash */}
      <motion.div
        className="absolute inset-0 bg-amber-400/20"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      />

      {/* Fireworks canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Victory card */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="rounded-2xl border border-amber-500/30 bg-gray-900/90 backdrop-blur-xl p-8 text-center shadow-2xl shadow-amber-500/10 max-w-sm mx-4"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Trophy size={48} className="mx-auto text-amber-400 mb-4" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">任务完成！</h2>
              <p className="text-sm text-gray-400 mb-4">数据中心服务已恢复</p>

              {/* Stars */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: s <= stars ? 1 : 0.6, rotate: 0 }}
                    transition={{ delay: 0.5 + s * 0.2, type: 'spring' }}
                  >
                    <Star
                      size={32}
                      className={s <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Score */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="rounded-xl bg-gray-800/60 px-4 py-3 mb-6"
              >
                <div className="flex items-center justify-center gap-2 text-lg font-bold text-amber-400 font-mono">
                  <Sparkles size={18} />
                  {score.toLocaleString()} 分
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                onClick={onDismiss}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-amber-400"
              >
                继续前进
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
