/**
 * Reveal — 滚动入场包装器
 *
 * 使用 IntersectionObserver 在元素首次进入视口时添加 `.reveal-in` class，
 * 触发 CSS transition：translateY(24px) + opacity 0 → 最终态。
 *
 * - 尊重 `prefers-reduced-motion`（直接显示完整态，跳过动画）。
 * - `delayMs` 支持 stagger 错落入场。
 * - 只触发一次（once=true 默认），避免反复触发。
 */

'use client';

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms (applied via inline transition-delay). */
  delayMs?: number;
  /** Additional class names applied to the wrapper. */
  className?: string;
}

export default function Reveal({
  children,
  delayMs = 0,
  className = '',
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced-motion users skip animation entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => setShown(true));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties = {
    transitionDelay: shown && delayMs > 0 ? `${delayMs}ms` : undefined,
  };

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
