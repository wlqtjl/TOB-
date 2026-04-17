'use client';

/**
 * ZBS Data Flow Story Mode — 五场景交互叙事
 *
 * 用"故事讲述"方式让非技术用户理解 ZBS 分布式存储原理
 * 替代物理粒子仿真模式（仿真模式仍保留于 /data-gravity）
 */

import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ZBSFlowViz from '../../../components/game/ZBSFlowViz';

function StoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromLevel = searchParams.get('from') === 'level';
  const levelId = searchParams.get('levelId') ?? '2';

  const handleComplete = useCallback(() => {
    if (fromLevel) {
      router.push(`/level/${levelId}`);
    } else {
      router.push('/data-gravity');
    }
  }, [fromLevel, levelId, router]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={fromLevel ? `/level/${levelId}` : '/data-gravity'}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition"
          >
            <ArrowLeft size={14} /> {fromLevel ? '返回关卡' : '返回仿真'}
          </Link>

          {/* Mode switcher */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-1 flex gap-1">
            <span className="rounded-md px-3 py-1 text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">
              🎬 故事模式
            </span>
            <Link
              href="/data-gravity"
              className="rounded-md px-3 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition"
            >
              ⚛️ 仿真模式
            </Link>
          </div>
        </div>
      </div>

      {/* ZBS Flow Visualization */}
      <div className="mx-auto max-w-3xl px-4 pb-8">
        <ZBSFlowViz
          onComplete={handleComplete}
          courseId="smartx-halo"
          levelId={levelId}
        />
      </div>
    </div>
  );
}

export default function ZBSStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">加载可视化...</p>
      </div>
    }>
      <StoryContent />
    </Suspense>
  );
}
