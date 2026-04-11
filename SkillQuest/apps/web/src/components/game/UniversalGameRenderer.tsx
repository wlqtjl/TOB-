'use client';

/**
 * UniversalGameRenderer — Single Canvas rendering engine for ALL level types
 *
 * Accepts a VisualScene as the sole prop. Internally:
 * - Renders entities (icons, labels, state indicators) on Canvas
 * - Draws connections (Bezier curves) between entities
 * - Drives ParticleSystem via requestAnimationFrame
 * - Handles click/hover interactions via hit-testing
 *
 * This one component replaces all per-type rendering code.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type {
  VisualScene,
  VisualEntity,
  VisualConnection,
  InteractionResult,
} from '@skillquest/game-engine';
import { ParticleSystem, type BezierPath } from './ParticleSystem';

interface Props {
  scene: VisualScene;
  onInteraction?: (result: InteractionResult) => void;
  /** Optional class for the container */
  className?: string;
  /** Show debug info (particle count, FPS) */
  debug?: boolean;
}

// ─── Render helpers ────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  spacing: number,
) {
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
  ctx.globalAlpha = 1;
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  conn: VisualConnection,
  entityMap: Map<string, VisualEntity>,
) {
  const from = entityMap.get(conn.from);
  const to = entityMap.get(conn.to);
  if (!from || !to) return;

  ctx.strokeStyle = conn.style.color;
  ctx.lineWidth = conn.style.width;
  ctx.globalAlpha = conn.style.opacity;

  if (conn.style.dashPattern && conn.style.dashPattern.length > 0) {
    ctx.setLineDash(conn.style.dashPattern);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  if (conn.bezierControl) {
    const { cx1, cy1, cx2, cy2 } = conn.bezierControl;
    ctx.moveTo(from.position.x, from.position.y);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, to.position.x, to.position.y);
  } else {
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: VisualEntity,
  isHovered: boolean,
) {
  const { x, y } = entity.position;
  const { w, h } = entity.size;
  const half_w = w / 2;
  const half_h = h / 2;

  ctx.globalAlpha = entity.style.opacity;

  // Glow effect
  if (entity.style.glowColor && entity.style.glowRadius) {
    ctx.shadowColor = entity.style.glowColor;
    ctx.shadowBlur = entity.style.glowRadius * (isHovered ? 2 : 1);
  }

  // Background
  ctx.fillStyle = entity.style.fill;
  ctx.strokeStyle = entity.style.stroke;
  ctx.lineWidth = entity.style.strokeWidth;

  // Circle for small entities, rounded rect for larger ones
  if (w <= 80 && h <= 80) {
    const radius = Math.min(half_w, half_h);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const rx = x - half_w;
    const ry = y - half_h;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + w - r, ry);
    ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
    ctx.lineTo(rx + w, ry + h - r);
    ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
    ctx.lineTo(rx + r, ry + h);
    ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Icon
  ctx.font = w <= 80 ? '24px serif' : '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(entity.icon, x, y - (w > 80 ? 4 : 0));

  // Label (below icon for small entities, beside icon for large)
  if (entity.label) {
    ctx.font = w <= 80 ? '10px sans-serif' : '12px sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.textAlign = 'center';

    if (w <= 80) {
      // Below the circle
      const lines = entity.label.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(
          line.length > 12 ? line.slice(0, 12) + '…' : line,
          x,
          y + half_h + 14 + i * 14,
        );
      });
    } else {
      // Inside the rect, below icon
      const lines = entity.label.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(
          line.length > 30 ? line.slice(0, 30) + '…' : line,
          x,
          y + 10 + i * 14,
        );
      });
    }
  }

  // Stars metadata
  const starsDisplay = entity.metadata.starsDisplay as string | undefined;
  if (starsDisplay) {
    ctx.font = '10px serif';
    ctx.fillText(starsDisplay, x, y + half_h + 28);
  }

  ctx.globalAlpha = 1;
}

// ─── Component ─────────────────────────────────────────────────────

export default function UniversalGameRenderer({
  scene,
  onInteraction,
  className = '',
  debug = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);

  // Build entity map for quick lookup
  const entityMapRef = useRef(new Map<string, VisualEntity>());
  useEffect(() => {
    const map = new Map<string, VisualEntity>();
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
      const from = entityMap.get(conn.from);
      const to = entityMap.get(conn.to);
      if (!from || !to) continue;

      if (conn.bezierControl) {
        paths.set(conn.id, {
          x0: from.position.x,
          y0: from.position.y,
          cx1: conn.bezierControl.cx1,
          cy1: conn.bezierControl.cy1,
          cx2: conn.bezierControl.cx2,
          cy2: conn.bezierControl.cy2,
          x1: to.position.x,
          y1: to.position.y,
        });
      } else {
        // Straight line: control points at 1/3 and 2/3
        const dx = to.position.x - from.position.x;
        const dy = to.position.y - from.position.y;
        paths.set(conn.id, {
          x0: from.position.x,
          y0: from.position.y,
          cx1: from.position.x + dx / 3,
          cy1: from.position.y + dy / 3,
          cx2: from.position.x + (2 * dx) / 3,
          cy2: from.position.y + (2 * dy) / 3,
          x1: to.position.x,
          y1: to.position.y,
        });
      }
    }
    bezierPathsRef.current = paths;
  }, [scene.connections, scene.entities]);

  // Initialize particle system and emit particles
  useEffect(() => {
    if (!particleSystemRef.current) {
      particleSystemRef.current = new ParticleSystem();
    }
    const ps = particleSystemRef.current;

    // Emit particles for enabled connections
    for (const conn of scene.connections) {
      if (conn.particleConfig.enabled) {
        ps.emitForConnection(conn.id, conn.particleConfig);
      } else {
        ps.removeConnection(conn.id);
      }
    }
  }, [scene.connections]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = scene.viewport;
    canvas.width = width;
    canvas.height = height;

    const ps = particleSystemRef.current ?? new ParticleSystem();
    particleSystemRef.current = ps;

    lastTimeRef.current = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap dt
      lastTimeRef.current = now;

      if (!ctx || !canvas) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      const bg = scene.viewport.background;
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      if (bg.gridVisible && bg.gridColor && bg.gridSpacing) {
        drawGrid(ctx, canvas.width, canvas.height, bg.gridColor, bg.gridSpacing);
      }

      // Draw connections
      for (const conn of scene.connections) {
        drawConnection(ctx, conn, entityMapRef.current);
      }

      // Update and render particles
      ps.update(dt, bezierPathsRef.current);
      ps.render(ctx);

      // Draw entities
      for (const entity of scene.entities) {
        drawEntity(ctx, entity, entity.id === hoveredId);
      }

      // Debug overlay
      if (debug) {
        frameCountRef.current++;
        fpsTimerRef.current += dt;
        if (fpsTimerRef.current >= 1) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          fpsTimerRef.current = 0;
        }

        ctx.fillStyle = '#00ff00';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${fps} FPS | ${ps.activeCount} particles`, 8, 16);
      }

      animFrameRef.current = requestAnimationFrame(frame);
    }

    animFrameRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [scene, hoveredId, debug, fps]);

  // Hit-testing for mouse interactions
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onInteraction) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Find clicked entity
      for (const entity of scene.entities) {
        const dx = mx - entity.position.x;
        const dy = my - entity.position.y;
        const hw = entity.size.w / 2;
        const hh = entity.size.h / 2;

        if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
          // Try click interactions
          for (const rule of scene.interactions) {
            if (rule.type === 'click') {
              if (rule.sourceFilter && entity.group !== rule.sourceFilter) continue;
              const result = rule.validate({ entityId: entity.id });
              onInteraction(result);

              // Emit burst at click position
              if (particleSystemRef.current) {
                const effectConfig = result.correct
                  ? scene.feedback.correctEffect
                  : { count: 10, color: '#ef4444', speed: 100, lifetime: 0.4, spread: Math.PI * 2 };
                particleSystemRef.current.emitBurst(
                  entity.position.x,
                  entity.position.y,
                  effectConfig,
                );
              }
              return;
            }
          }
        }
      }
    },
    [scene, onInteraction],
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const entity of scene.entities) {
        const dx = mx - entity.position.x;
        const dy = my - entity.position.y;
        const hw = entity.size.w / 2;
        const hh = entity.size.h / 2;

        if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
          setHoveredId(entity.id);
          const isClickable = entity.metadata.clickable !== false && entity.style.opacity > 0.5;
      canvas.style.cursor = isClickable ? 'pointer' : 'not-allowed';
          return;
        }
      }
      setHoveredId(null);
      canvas.style.cursor = 'default';
    },
    [scene.entities],
  );

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={scene.viewport.width}
        height={scene.viewport.height}
        className="rounded-xl"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        style={{ width: '100%', height: 'auto', maxWidth: scene.viewport.width }}
      />
    </div>
  );
}
