/**
 * FeedbackEffects — Visual feedback for game interactions
 *
 * Provides:
 * - Shake effect (wrong answer)
 * - Celebration (level completion — fireworks/confetti/ripple)
 * - Combo escalation visual tier
 * - Screen flash
 */

import type { FeedbackConfig, ParticleBurst, ShakeConfig, CelebrationConfig } from '@skillquest/game-engine';
import type { ParticleSystem } from './ParticleSystem';

export interface ActiveShake {
  elapsed: number;
  duration: number;
  intensity: number;
}

export interface ActiveCelebration {
  type: 'fireworks' | 'confetti' | 'ripple';
  elapsed: number;
  duration: number;
  colors: string[];
}

export interface FeedbackState {
  shake: ActiveShake | null;
  celebration: ActiveCelebration | null;
  screenFlash: { color: string; alpha: number } | null;
}

export function createFeedbackState(): FeedbackState {
  return { shake: null, celebration: null, screenFlash: null };
}

/** Trigger correct answer feedback */
export function triggerCorrect(
  ps: ParticleSystem,
  x: number,
  y: number,
  feedback: FeedbackConfig,
  comboTier?: string,
): FeedbackState {
  // Base correct burst
  ps.emitBurst(x, y, feedback.correctEffect);

  // Combo escalation burst
  if (comboTier && feedback.comboEffects[comboTier]) {
    const comboEffect = feedback.comboEffects[comboTier];
    ps.emitBurst(x, y - 20, comboEffect);
  }

  return {
    shake: null,
    celebration: null,
    screenFlash: { color: '#22c55e', alpha: 0.15 },
  };
}

/** Trigger wrong answer feedback */
export function triggerWrong(
  feedback: FeedbackConfig,
): FeedbackState {
  return {
    shake: {
      elapsed: 0,
      duration: feedback.wrongEffect.duration,
      intensity: feedback.wrongEffect.intensity,
    },
    celebration: null,
    screenFlash: { color: '#ef4444', alpha: 0.1 },
  };
}

/** Trigger level completion celebration */
export function triggerCompletion(
  ps: ParticleSystem,
  canvasWidth: number,
  canvasHeight: number,
  feedback: FeedbackConfig,
): FeedbackState {
  const { completionEffect } = feedback;

  // Emit celebration bursts across the canvas
  const burstPoints = [
    { x: canvasWidth * 0.2, y: canvasHeight * 0.3 },
    { x: canvasWidth * 0.5, y: canvasHeight * 0.2 },
    { x: canvasWidth * 0.8, y: canvasHeight * 0.3 },
    { x: canvasWidth * 0.35, y: canvasHeight * 0.5 },
    { x: canvasWidth * 0.65, y: canvasHeight * 0.5 },
  ];

  for (let i = 0; i < burstPoints.length; i++) {
    const pt = burstPoints[i];
    const color = completionEffect.colors[i % completionEffect.colors.length];
    ps.emitBurst(pt.x, pt.y, {
      count: 40,
      color,
      speed: 250,
      lifetime: 1.5,
      spread: Math.PI * 2,
    });
  }

  return {
    shake: null,
    celebration: {
      type: completionEffect.type,
      elapsed: 0,
      duration: completionEffect.duration,
      colors: completionEffect.colors,
    },
    screenFlash: { color: '#FFD700', alpha: 0.2 },
  };
}

/** Update feedback effects each frame. Returns updated state. */
export function updateFeedback(
  state: FeedbackState,
  dt: number,
): FeedbackState {
  let shake = state.shake;
  let celebration = state.celebration;
  let screenFlash = state.screenFlash;

  // Decay shake
  if (shake) {
    shake = { ...shake, elapsed: shake.elapsed + dt };
    if (shake.elapsed >= shake.duration) {
      shake = null;
    }
  }

  // Decay celebration
  if (celebration) {
    celebration = { ...celebration, elapsed: celebration.elapsed + dt };
    if (celebration.elapsed >= celebration.duration) {
      celebration = null;
    }
  }

  // Decay screen flash
  if (screenFlash) {
    const newAlpha = screenFlash.alpha - dt * 0.5; // fade in 0.3s
    screenFlash = newAlpha > 0 ? { ...screenFlash, alpha: newAlpha } : null;
  }

  return { shake, celebration, screenFlash };
}

/** Render feedback overlays on canvas */
export function renderFeedback(
  ctx: CanvasRenderingContext2D,
  state: FeedbackState,
  canvasWidth: number,
  canvasHeight: number,
): { offsetX: number; offsetY: number } {
  let offsetX = 0;
  let offsetY = 0;

  // Screen flash overlay
  if (state.screenFlash) {
    ctx.save();
    ctx.globalAlpha = state.screenFlash.alpha;
    ctx.fillStyle = state.screenFlash.color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  // Shake offset
  if (state.shake) {
    const progress = state.shake.elapsed / state.shake.duration;
    const decay = 1 - progress;
    const freq = 15; // shake frequency
    offsetX = Math.sin(progress * freq * Math.PI * 2) * state.shake.intensity * decay;
    offsetY = Math.cos(progress * freq * Math.PI * 2) * state.shake.intensity * decay * 0.5;
  }

  // Celebration overlay
  if (state.celebration) {
    const progress = state.celebration.elapsed / state.celebration.duration;

    if (state.celebration.type === 'ripple') {
      ctx.save();
      const maxRadius = Math.max(canvasWidth, canvasHeight);
      const radius = progress * maxRadius;
      ctx.globalAlpha = (1 - progress) * 0.3;
      ctx.strokeStyle = state.celebration.colors[0];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // fireworks and confetti are handled by ParticleSystem bursts
  }

  return { offsetX, offsetY };
}

/** Get combo tier name based on combo count */
export function getComboTier(comboCount: number): string | undefined {
  if (comboCount >= 20) return 'legendary';
  if (comboCount >= 10) return 'amazing';
  if (comboCount >= 5) return 'great';
  if (comboCount >= 3) return 'good';
  return undefined;
}
