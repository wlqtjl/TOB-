/**
 * Typewriter — 打字机文本
 *
 * 自研极简实现：每 `stepMs` 增加一个字符直到显示完整 `text`。
 * - reduced-motion 下直接显示完整 text。
 * - 完成后右侧光标持续闪烁（可通过 `showCaret={false}` 关闭）。
 */

'use client';

import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  stepMs?: number;
  /** Delay before typing starts. */
  startDelayMs?: number;
  showCaret?: boolean;
  className?: string;
}

export default function Typewriter({
  text,
  stepMs = 35,
  startDelayMs = 0,
  showCaret = true,
  className = '',
}: TypewriterProps) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Reset when text changes (microtask to satisfy strict effect rule).
    queueMicrotask(() => {
      setCount(0);
      setDone(false);
    });

    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => {
        setCount(text.length);
        setDone(true);
      });
      return;
    }

    const chars = Array.from(text);
    let i = 0;
    let timer: number | undefined;
    const startTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= chars.length) {
          if (timer != null) window.clearInterval(timer);
          setDone(true);
        }
      }, stepMs);
    }, startDelayMs);

    return () => {
      window.clearTimeout(startTimer);
      if (timer != null) window.clearInterval(timer);
    };
  }, [text, stepMs, startDelayMs]);

  const shown = Array.from(text).slice(0, count).join('');

  return (
    <span className={className}>
      {shown}
      {showCaret && (
        <span
          aria-hidden="true"
          className={`typewriter-caret ${done ? 'typewriter-caret-blink' : ''}`}
        />
      )}
    </span>
  );
}
