/**
 * useParticleLoop — requestAnimationFrame hook for Canvas rendering
 *
 * Provides a clean RAF loop with dt calculation, DPI scaling,
 * and automatic cleanup on unmount.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

export interface LoopContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  dt: number;         // seconds since last frame
  width: number;      // logical canvas width
  height: number;     // logical canvas height
  dpr: number;        // device pixel ratio
}

type RenderCallback = (lc: LoopContext) => void;

interface UseParticleLoopOptions {
  /** Logical canvas width */
  width: number;
  /** Logical canvas height */
  height: number;
  /** Whether to enable DPI scaling */
  enableDPI?: boolean;
}

export function useParticleLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  render: RenderCallback,
  options: UseParticleLoopOptions,
) {
  const { width, height, enableDPI = true } = options;
  const animFrameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const renderRef = useRef(render);

  // Keep render callback fresh without causing re-effects
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Setup canvas size and DPI
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = enableDPI ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { ctx, canvas, dpr };
  }, [canvasRef, width, height, enableDPI]);

  // Animation loop
  useEffect(() => {
    const result = setupCanvas();
    if (!result) return;

    const { ctx, canvas, dpr } = result;
    lastTimeRef.current = performance.now();
    let active = true;

    function frame(now: number) {
      if (!active) return;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap at 0.05s (50ms) to prevent spiral-of-death
      lastTimeRef.current = now;

      // FPS tracking
      frameCountRef.current++;
      fpsTimerRef.current += dt;
      if (fpsTimerRef.current >= 1) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        fpsTimerRef.current = 0;
      }

      renderRef.current({ ctx, canvas, dt, width, height, dpr });
      animFrameRef.current = requestAnimationFrame(frame);
    }

    animFrameRef.current = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [setupCanvas, width, height]);

  return { fps };
}
