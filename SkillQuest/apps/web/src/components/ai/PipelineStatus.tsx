/**
 * PipelineStatus — 课程生产流水线状态指示器
 *
 * Linear 风格的视觉状态展示:
 * - UPLOADING: 灰色进度条
 * - ANALYZING: 蓝色脉冲动画
 * - GENERATING: 蓝色脉冲 + X/Y 计数
 * - REVIEWING: 橙色警告标识
 * - PUBLISHED: 绿色勾选
 */

'use client';

import React from 'react';
import { Upload, Search, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────

export type PipelineStatusType =
  | 'UPLOADING'
  | 'ANALYZING'
  | 'GENERATING'
  | 'REVIEWING'
  | 'PUBLISHED';

interface PipelineStatusProps {
  status: PipelineStatusType;
  progress?: { done?: number; total?: number; message?: string };
  compact?: boolean;
}

// ─── Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PipelineStatusType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    dotColor: string;
    pulse: boolean;
  }
> = {
  UPLOADING: {
    label: '上传中',
    icon: Upload,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    dotColor: 'bg-gray-400',
    pulse: false,
  },
  ANALYZING: {
    label: '分析中',
    icon: Search,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
    pulse: true,
  },
  GENERATING: {
    label: '生成中',
    icon: Cpu,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
    pulse: true,
  },
  REVIEWING: {
    label: '待审核',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
    pulse: false,
  },
  PUBLISHED: {
    label: '已发布',
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
    pulse: false,
  },
};

// ─── Component ────────────────────────────────────────────────────────

export default function PipelineStatus({
  status,
  progress,
  compact = false,
}: PipelineStatusProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.UPLOADING;
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}
          />
        </span>
        {config.label}
        {status === 'GENERATING' && progress?.done != null && progress?.total != null && (
          <span className="font-mono">
            {progress.done}/{progress.total}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${config.bgColor}`}>
      <div className="relative">
        <Icon className={`w-5 h-5 ${config.textColor}`} />
        {config.pulse && (
          <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${config.dotColor} animate-ping`} />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
          {status === 'GENERATING' && progress?.done != null && progress?.total != null && (
            <span className="font-mono ml-2">
              ({progress.done}/{progress.total})
            </span>
          )}
        </p>
        {progress?.message && (
          <p className="text-xs text-gray-500 mt-0.5">{progress.message}</p>
        )}
      </div>
    </div>
  );
}
