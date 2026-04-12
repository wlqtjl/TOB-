/**
 * 闯关地图页面 — Minimalist redesign
 *
 * Design: Deep navy base, Lucide icons, generous whitespace
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, Star, BarChart3 } from 'lucide-react';
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
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-base-300">未找到课程数据</p>
          <p className="mt-2 text-sm text-base-400">课程ID: {courseId}</p>
          <Link href="/" className="mt-4 inline-block text-accent hover:underline text-sm">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const mapScene = mapAdapter(mapData);
  const passedNodes = mapData.nodes.filter((n) => n.status === 'passed').length;

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-100">闯关地图</h1>
          <p className="mt-1 text-sm font-light text-base-300">
            {course.title} · {mapData.nodes.length} 关卡 · {passedNodes} 已通关
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-sm text-base-400">
            <span className="flex items-center gap-1">
              <Star size={14} strokeWidth={1.5} />
              {course.earnedStars}/{course.totalStars}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 size={14} strokeWidth={1.5} />
              Level {course.userLevel}
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 transition hover:text-base-100 hover:bg-base-700/50"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            返回首页
          </Link>
        </div>
      </div>

      {/* ── Course switcher ── */}
      {COURSES.length > 1 && (
        <div className="mb-6">
          <p className="text-xs text-base-500 mb-2">切换课程</p>
          <div className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <Link
                key={c.id}
                href={`/map?course=${c.id}`}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  c.id === courseId
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-base-400 border border-base-600/30 hover:border-base-500 hover:text-base-200'
                }`}
              >
                {c.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Canvas Map ── */}
      <div className="mx-auto max-w-[900px]">
        <ErrorBoundary>
          <UniversalGameRenderer
            scene={mapScene}
            className="border border-base-600/30 rounded-2xl overflow-hidden"
            debug={false}
          />
        </ErrorBoundary>
      </div>

      {/* ── Legend ── */}
      <div className="mx-auto mt-6 max-w-[900px] flex items-center justify-between">
        <div className="flex gap-6 text-xs text-base-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
            已通关
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent/30 border border-accent/50" />
            可挑战
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-base-700 border border-base-600/50" />
            锁定
          </span>
        </div>
        <p className="text-xs text-base-500">
          {tenant.companyName}
        </p>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-900 flex items-center justify-center"><p className="text-base-400 animate-pulse">加载闯关地图...</p></div>}>
      <MapContent />
    </Suspense>
  );
}
