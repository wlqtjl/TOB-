/**
 * 闯关地图页面 — Canvas 粒子流 + 单租户课程展示
 *
 * 核心: VisualScene 协议 + UniversalGameRenderer
 * 通过 ?course=xxx 参数切换本租户的不同课程
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { mapAdapter } from '@skillquest/game-engine';
import UniversalGameRenderer from '../../../components/game/UniversalGameRenderer';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { useCourseId } from '../../../hooks/useCourseId';
import { COURSES, getMapData, getCourse } from '../../../lib/mock-courses';
import { tenantConfig } from '../../../lib/tenant-config';

const tenant = tenantConfig();

function MapContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const mapData = getMapData(courseId);

  if (!mapData || !course) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-400">😕 未找到课程数据</p>
          <p className="mt-2 text-sm text-gray-600">课程ID: {courseId}</p>
          <a href="/" className="mt-4 inline-block text-blue-400 hover:underline text-sm">← 返回首页</a>
        </div>
      </div>
    );
  }

  const mapScene = mapAdapter(mapData);
  const passedNodes = mapData.nodes.filter((n) => n.status === 'passed').length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* 页头 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-300">🗺️ 闯关地图</h1>
          <p className="text-sm text-gray-500">
            {course.title} · {mapData.nodes.length}个关卡 · {passedNodes}个已通关
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm text-gray-400">
            <span>⭐ 总星数: {course.earnedStars}/{course.totalStars}</span>
            <span>🔥 XP: {course.xp.toLocaleString()}</span>
            <span>📊 Level {course.userLevel}</span>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回首页
          </Link>
        </div>
      </div>

      {/* 课程切换 — 显示本租户的课程 */}
      {COURSES.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2">切换课程:</p>
          <div className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <Link
                key={c.id}
                href={`/map?course=${c.id}`}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  c.id === courseId
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {c.icon} {c.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Canvas 粒子地图 */}
      <div className="mx-auto max-w-[900px]">
        <ErrorBoundary>
          <UniversalGameRenderer
            scene={mapScene}
            className="border border-gray-800 rounded-xl overflow-hidden"
            debug={false}
          />
        </ErrorBoundary>
      </div>

      {/* 图例 */}
      <div className="mx-auto mt-4 max-w-[900px] flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500/20" /> 已通关 (金色粒子流)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-blue-400 bg-blue-500/20" /> 可挑战 (蓝色脉冲)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-gray-700 bg-gray-800/50" /> 锁定
          </span>
        </div>
        <p className="text-xs text-gray-600">
          {tenant.companyName} · Canvas 粒子引擎
        </p>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500 animate-pulse">加载闯关地图...</p></div>}>
      <MapContent />
    </Suspense>
  );
}
