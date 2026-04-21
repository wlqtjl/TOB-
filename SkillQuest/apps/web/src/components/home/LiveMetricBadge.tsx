/**
 * LiveMetricBadge — Hero 中循环切换的伪实时 metric 徽标
 *
 * 每 ~5s 随机在 `metrics` 列表中切换，给人"数据活着"的感觉。
 * 纯前端字符串动画，不涉及真实后端数据。
 */

'use client';

import { useEffect, useState } from 'react';

const DEFAULT_METRICS = [
  'LIVE · 数据包实时流动中',
  'Core → DB 延迟 1.2ms',
  'Storage IOPS 98%',
  'Edge 流量 2.3Gbps',
  'VPN 在线会话 1,842',
  'App 节点吞吐 540k req/s',
];

interface LiveMetricBadgeProps {
  metrics?: string[];
  intervalMs?: number;
}

export default function LiveMetricBadge({
  metrics = DEFAULT_METRICS,
  intervalMs = 4500,
}: LiveMetricBadgeProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % metrics.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [metrics.length, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur hero-fade-in">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span key={idx} className="live-metric-text">
        {metrics[idx]}
      </span>
    </span>
  );
}
