'use client';

/**
 * UniversalGameRenderer — Single Canvas rendering engine for ALL level types
 *
 * Accepts a VisualScene as the sole prop. Uses modular subsystems:
 * - EntityRenderer: draws entities (icons, labels, glow, selection)
 * - ConnectionRenderer: draws Bezier curves + arrowheads
 * - ParticleSystem: Canvas 2D particle engine with object pooling
 * - InteractionManager: click/drag/connect/sequence/input handling
 * - FeedbackEffects: shake, celebration, combo, screen flash
 *
 * This one component replaces all per-type rendering code.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type {
  VisualScene,
  InteractionResult,
} from '@skillquest/game-engine';
import { ParticleSystem } from './ParticleSystem';
import { drawEntity } from './EntityRenderer';
import { drawConnection, drawPendingConnection, buildBezierPath, type BezierPath } from './ConnectionRenderer';
import {
  updateFeedback,
  renderFeedback,
  triggerCorrect,
  triggerWrong,
  createFeedbackState,
  type FeedbackState,
} from './FeedbackEffects';
import { useParticleLoop } from './hooks/useParticleLoop';
import { useInteraction } from './hooks/useInteraction';

interface Props {
  scene: VisualScene;
  onInteraction?: (result: InteractionResult) => void;
  /** Current combo count for visual feedback tier */
  comboCount?: number;
  /** Optional class for the container */
  className?: string;
  /** Show debug info (particle count, FPS) */
  debug?: boolean;
}

// ─── Background grid ───────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  spacing: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.05;
  for (let x = 0; x < w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Component ─────────────────────────────────────────────────────

export default function UniversalGameRenderer({
  scene,
  onInteraction,
  comboCount = 0,
  className = '',
  debug = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const feedbackRef = useRef<FeedbackState>(createFeedbackState());

  // Interaction hook
  const { state: interactionState, handlers } = useInteraction({
    scene,
    onResult: useCallback(
      (result: InteractionResult) => {
        // Trigger visual feedback
        const ps = particleSystemRef.current;
        if (ps) {
          if (result.correct) {
            const tier = comboCount >= 20 ? 'legendary' : comboCount >= 10 ? 'amazing' : comboCount >= 5 ? 'great' : comboCount >= 3 ? 'good' : undefined;
            feedbackRef.current = triggerCorrect(
              ps,
              scene.viewport.width / 2,
              scene.viewport.height / 2,
              scene.feedback,
              tier,
            );
          } else {
            feedbackRef.current = triggerWrong(scene.feedback);
          }
        }
        onInteraction?.(result);
      },
      [onInteraction, scene.feedback, scene.viewport, comboCount],
    ),
  });

  // Build entity map for quick lookup
  const entityMapRef = useRef(new Map<string, (typeof scene.entities)[0]>());
  useEffect(() => {
    const map = new Map<string, (typeof scene.entities)[0]>();
    for (const e of scene.entities) {
      map.set(e.id, e);
    }
    entityMapRef.current = map;
  }, [scene.entities]);

  // Build bezier paths for particle system
  const bezierPathsRef = useRef(new Map<string, BezierPath>());
  useEffect(() => {
    const paths = new Map<string, BezierPath>();
    const entityMap = entityMapRef.current;

    for (const conn of scene.connections) {
      if (!conn.particleConfig.enabled) continue;
      const path = buildBezierPath(conn, entityMap);
      if (path) paths.set(conn.id, path);
    }
    bezierPathsRef.current = paths;
  }, [scene.connections, scene.entities]);

  // Initialize particle system
  useEffect(() => {
    if (!particleSystemRef.current) {
      particleSystemRef.current = new ParticleSystem();
    }
    const ps = particleSystemRef.current;

    for (const conn of scene.connections) {
      if (conn.particleConfig.enabled) {
        ps.emitForConnection(conn.id, conn.particleConfig);
      } else {
        ps.removeConnection(conn.id);
      }
    }
  }, [scene.connections]);

  // Render loop via hook
  const { fps } = useParticleLoop(canvasRef, (lc) => {
    const { ctx, dt, width, height } = lc;
    const ps = particleSystemRef.current;
    if (!ps) return;

    // Update feedback state
    feedbackRef.current = updateFeedback(feedbackRef.current, dt);
    const { offsetX, offsetY } = renderFeedback(ctx, feedbackRef.current, width, height);

    // Apply shake offset
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Clear
    ctx.clearRect(-10, -10, width + 20, height + 20);

    // Background
    const bg = scene.viewport.background;
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (bg.gridVisible && bg.gridColor && bg.gridSpacing) {
      drawGrid(ctx, width, height, bg.gridColor, bg.gridSpacing);
    }

    // Highlight set for connections
    const highlightSet = new Set(interactionState.sequenceIds);

    // Draw connections
    for (const conn of scene.connections) {
      drawConnection(ctx, conn, entityMapRef.current, highlightSet);
    }

    // Draw pending connection line (during connect interaction)
    if (interactionState.pendingLine) {
      const pl = interactionState.pendingLine;
      drawPendingConnection(ctx, pl.fromX, pl.fromY, pl.toX, pl.toY);
    }

    // Update and render particles
    ps.update(dt, bezierPathsRef.current);
    ps.render(ctx);

    // Draw entities
    for (const entity of scene.entities) {
      drawEntity(
        ctx,
        entity,
        entity.id === interactionState.hoveredId,
        entity.id === interactionState.selectedId ||
          interactionState.sequenceIds.includes(entity.id),
      );
    }

    // Render feedback overlay (screen flash is drawn last)
    renderFeedback(ctx, feedbackRef.current, width, height);

    ctx.restore();

    // Debug overlay
    if (debug) {
      ctx.fillStyle = '#00ff00';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${fps} FPS | ${ps.activeCount} particles`, 8, 16);
    }
  }, {
    width: scene.viewport.width,
    height: scene.viewport.height,
    enableDPI: true,
  });

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-xl"
        onClick={handlers.onClick}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        style={{ width: '100%', height: 'auto', maxWidth: scene.viewport.width }}
      />
    </div>
  );
}
