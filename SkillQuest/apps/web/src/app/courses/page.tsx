/**
 * 课程管理页面 — 极简主义重构
 *
 * Design: Minimalist / Tech-cold
 * Base: #0D1117 (deep navy), Accent: #58A6FF (electric blue)
 * Icons: Lucide-React thin/light weight only
 * Frosted glass on action areas, generous whitespace
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Map,
  Trophy,
  Gamepad2,
  Star,
  BarChart3,
  Layers,
  Monitor,
  FileText,
  Cpu,
} from 'lucide-react';
import { COURSES } from '../../lib/mock-courses';
import { tenantConfig } from '../../lib/tenant-config';
import CourseImportDialog from '../../components/ui/CourseImportDialog';

const tenant = tenantConfig();

export default function CoursesPage() {
  const router = useRouter();
  const [showImport, setShowImport] = useState(false);

  const handleImportSuccess = (courseId: string) => {
    setShowImport(false);
    router.push(`/map?course=${courseId}`);
  };

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* ── Header ── */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">
              {tenant.adminTitle}
            </h1>
            <p className="mt-1 text-sm font-light text-base-600">
              {tenant.companyName} · {COURSES.length} 门培训课程
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 transition hover:text-base-900 hover:bg-base-100"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            返回首页
          </Link>
        </div>

        {/* ── Upload Area — Frosted Glass ── */}
        <div className="glass mb-12 rounded-2xl p-8 text-center">
          <p className="text-base font-medium text-base-900">
            上传培训文档自动生成课程
          </p>
          <p className="mt-2 text-sm text-base-600">
            支持 PDF / Word / TXT — MinerU 智能解析 + AI 自动提取知识点并生成 7 种题型关卡
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-base-900 transition hover:bg-accent-300"
          >
            <Upload size={16} strokeWidth={1.5} />
            上传文档
          </button>
        </div>

        {/* ── Course Cards ── */}
        <div className="space-y-4">
          {COURSES.map((course) => (
            <div
              key={course.id}
              className="group rounded-2xl border border-base-200 bg-white p-7 transition-all hover:border-base-200 hover:bg-base-100"
            >
              <div className="flex items-start justify-between gap-6">
                {/* Left: info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold tracking-tight text-base-900 group-hover:text-accent transition-colors">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-sm font-light leading-relaxed text-base-600">
                    {course.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-base-400">
                    <span>{course.category}</span>
                    <span className="text-base-400">·</span>
                    <span>{course.levelCount} 关卡</span>
                    <span className="text-base-400">·</span>
                    <span className="flex items-center gap-1">
                      <Star size={12} strokeWidth={1.5} />
                      {course.earnedStars}/{course.totalStars}
                    </span>
                    <span className="text-base-400">·</span>
                    <span className="flex items-center gap-1">
                      <BarChart3 size={12} strokeWidth={1.5} />
                      {course.passedCount}/{course.levelCount} 通关
                    </span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/map?course=${course.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-xs font-medium text-accent transition hover:bg-accent/20"
                  >
                    <Map size={14} strokeWidth={1.5} />
                    闯关
                  </Link>
                  <Link
                    href={`/leaderboard?course=${course.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-base-600 transition hover:bg-base-100 hover:text-base-900"
                  >
                    <Trophy size={14} strokeWidth={1.5} />
                    排行
                  </Link>
                  <Link
                    href={`/play/topology/demo?course=${course.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-base-600 transition hover:bg-base-100 hover:text-base-900"
                  >
                    <Gamepad2 size={14} strokeWidth={1.5} />
                    演示
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-base-100">
                <div
                  className="h-full rounded-full bg-accent/60 transition-all"
                  style={{ width: `${Math.round((course.passedCount / course.levelCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Platform Stats ── */}
        <div className="mt-14 grid grid-cols-4 gap-4 text-center">
          {[
            { label: '关卡类型', value: '8 种', Icon: Layers },
            { label: '渲染引擎', value: 'Canvas 2D', Icon: Monitor },
            { label: '文档解析', value: 'MinerU', Icon: FileText },
            { label: 'AI 引擎', value: 'GPT-4o', Icon: Cpu },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-base-200 bg-white px-4 py-5"
            >
              <stat.Icon size={20} strokeWidth={1.5} className="mx-auto text-base-400" />
              <p className="mt-2 text-sm font-semibold text-base-900">{stat.value}</p>
              <p className="mt-0.5 text-xs text-base-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-12 text-center text-xs text-base-400">
          <p>{tenant.copyright}</p>
        </div>
      </div>

      {/* Upload Dialog */}
      {showImport && (
        <CourseImportDialog
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
