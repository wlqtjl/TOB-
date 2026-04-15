'use client';

/**
 * TimelineNode — 时间线节点组件
 *
 * 根据 status 切换视觉样式:
 * - correct:      绿色发光圆点 + 实线
 * - warning:      橙色发光圆点 + 虚线
 * - error:        红色发光圆点 + 抖动动画
 * - expert-only:  灰色半透明圆点
 */

import React from 'react';
import type { TimelineStepStatus } from '@skillquest/types';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
} from 'lucide-react';

interface TimelineNodeProps {
  actionName: string;
  description: string;
  status: TimelineStepStatus;
  timestamp: number;
  impactScore: number;
  deviationNotice?: string;
  isSelected: boolean;
  side: 'left' | 'right';
  onClick: () => void;
}

const STATUS_CONFIG: Record<TimelineStepStatus, {
  border: string;
  bg: string;
  glow: string;
  icon: React.ReactNode;
  textColor: string;
  label: string;
}> = {
  correct: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    icon: <CheckCircle size={16} strokeWidth={1.5} className="text-emerald-400" />,
    textColor: 'text-emerald-400',
    label: '正确',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    icon: <AlertTriangle size={16} strokeWidth={1.5} className="text-amber-400" />,
    textColor: 'text-amber-400',
    label: '次优',
  },
  error: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    glow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]',
    icon: <XCircle size={16} strokeWidth={1.5} className="text-red-600" />,
    textColor: 'text-red-600',
    label: '错误',
  },
  'expert-only': {
    border: 'border-base-200/60',
    bg: 'bg-white',
    glow: '',
    icon: <Lightbulb size={16} strokeWidth={1.5} className="text-base-400" />,
    textColor: 'text-base-400',
    label: '专家',
  },
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `+${m}:${s.toString().padStart(2, '0')}`;
}

const STATUS_INDICATOR_BG: Record<TimelineStepStatus, string> = {
  correct: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  'expert-only': 'bg-base-400',
};

export default function TimelineNode({
  actionName,
  description,
  status,
  timestamp,
  impactScore,
  deviationNotice,
  isSelected,
  side,
  onClick,
}: TimelineNodeProps) {
  const config = STATUS_CONFIG[status];
  const isError = status === 'error';

  return (
    <button
      onClick={onClick}
      className={[
        'group relative w-full max-w-[320px] rounded-xl border p-3 text-left transition-all duration-300',
        config.border,
        config.bg,
        isSelected ? `${config.glow} ring-1 ring-white/10 scale-[1.02]` : 'hover:scale-[1.01]',
        isError ? 'animate-node-shake' : '',
        side === 'left' ? 'ml-auto mr-0' : 'ml-0 mr-auto',
        'cursor-pointer',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        {config.icon}
        <span className={`text-xs font-mono ${config.textColor}`}>
          {formatTimestamp(timestamp)}
        </span>
        {impactScore < 0 && (
          <span className="ml-auto text-xs font-mono text-red-600/80">
            {impactScore} SLA
          </span>
        )}
      </div>

      {/* Action name */}
      <h4 className="text-sm font-medium text-base-900 leading-snug mb-1">
        {actionName}
      </h4>

      {/* Description */}
      <p className="text-xs text-base-600 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Deviation notice (inline preview) */}
      {deviationNotice && (
        <div className="mt-2 rounded-lg bg-red-900/20 border border-red-500/10 px-2.5 py-1.5">
          <p className="text-[11px] text-red-300/80 leading-relaxed line-clamp-2">
            {deviationNotice}
          </p>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className={`absolute top-0 ${side === 'left' ? '-right-2' : '-left-2'} w-1 h-full rounded-full ${STATUS_INDICATOR_BG[status]}`} />
      )}
    </button>
  );
}
