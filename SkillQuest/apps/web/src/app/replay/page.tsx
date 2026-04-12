'use client';

/**
 * Replay Page — /replay
 *
 * 专家对比复盘报告页面
 * 使用 ExpertComparisonTimeline 组件展示垂直双轨异动图
 */

import React, { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import ExpertComparisonTimeline from '../../components/game/ExpertComparisonTimeline';
import { MOCK_REPLAY_DATA } from '../../lib/mock-courses/replay-data';

export default function ReplayPage() {
  const handleStepClick = useCallback((snapshot: unknown) => {
    // In production, this would emit to the Canvas engine for rollback
    // e.g. emit('ROLLBACK_CANVAS', snapshot)
    console.log('[ReplayPage] Rollback to snapshot:', snapshot);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Top nav */}
      <div className="sticky top-0 z-30 glass-heavy">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <a
            href="/map"
            className="flex items-center gap-2 text-sm text-base-300 hover:text-base-100 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            返回关卡地图
          </a>
          <h1 className="text-sm font-medium text-base-200">
            专家对比复盘报告
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main content */}
      <ExpertComparisonTimeline
        data={MOCK_REPLAY_DATA}
        onStepClick={handleStepClick}
      />
    </div>
  );
}
