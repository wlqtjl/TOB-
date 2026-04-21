/**
 * CountUp — 数字滚动补间
 *
 * requestAnimationFrame 驱动，从 0（或 `from`）tween 到目标值。
 * - 首次进入视口（IntersectionObserver）后开始。
 * - 支持 `prefix` / `suffix` / `denominator`（显示 `{value}/{denominator}` 格式）。
 * - reduced-motion 下直接显示终值。
 * - `live` 模式：每 `liveIntervalMs` 在 ±`liveJitter` 范围内抖动显示值，用于"活数据"徽标。
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  from?: number;
  durationMs?: number;
  /** Optional denominator — renders as `{current}/{denominator}`. */
  denominator?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** If true, after initial tween finishes, jitter around value. */
  live?: boolean;
  liveJitter?: number;
  liveIntervalMs?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({
  value,
  from = 0,
  durationMs = 1200,
  denominator,
  prefix = '',
  suffix = '',
  className = '',
  live = false,
  liveJitter = 0,
  liveIntervalMs = 2000,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<number>(from);
  const [started, setStarted] = useState(false);

  // Start tween when visible
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => {
        setDisplay(value);
        setStarted(true);
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  // Tween
  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => setDisplay(value));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const delta = value - from;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(from + delta * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, from, durationMs]);

  // Live jitter (after tween)
  useEffect(() => {
    if (!started || !live || liveJitter <= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      const j = Math.round((Math.random() * 2 - 1) * liveJitter);
      setDisplay(value + j);
    }, liveIntervalMs);
    return () => window.clearInterval(id);
  }, [started, live, liveJitter, liveIntervalMs, value]);

  const formatted = display.toLocaleString();
  const denom = denominator != null ? `/${denominator.toLocaleString()}` : '';
  return (
    <span
      ref={ref}
      className={className}
      aria-live="off"
      aria-atomic="false"
    >
      {prefix}
      {formatted}
      {denom}
      {suffix}
    </span>
  );
}
