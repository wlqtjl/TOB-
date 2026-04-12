/**
 * 课程管理页面 — 单租户课程管理后台
 *
 * Phase 1: 静态课程列表 (从共享数据层读取)
 * Phase 2: 文档上传 → GPT-4o → 自动生成7种题型关卡 ✅ 已实现
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-200">⚙️ {tenant.adminTitle}</h1>
            <p className="text-sm text-gray-500">
              {tenant.companyName} · 当前已配置 {COURSES.length} 门培训课程
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回首页
          </Link>
        </div>

        {/* AI上传区域 */}
        <div className="mb-6 rounded-xl border border-dashed border-blue-500/40 bg-blue-950/10 p-6 text-center">
          <p className="text-lg text-blue-300">📄 上传培训文档自动生成课程</p>
          <p className="mt-2 text-sm text-gray-500">
            支持 PDF / Word / TXT — MinerU 智能解析 + AI 自动提取知识点并生成 7 种题型关卡
          </p>
          <p className="mt-1 text-xs text-gray-600">
            上传您的产品文档、技术白皮书、认证教材，AI 自动转化为游戏化培训课程
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
          >
            📤 上传文档生成课程
          </button>
        </div>

        {/* Course list */}
        <div className="space-y-4">
          {COURSES.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 transition hover:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{course.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-200">{course.title}</h2>
                    <p className="text-sm text-gray-500">{course.description}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                        {course.category}
                      </span>
                      <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                        {course.levelCount} 关卡
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-3 text-sm text-gray-400">
                    <span>⭐ {course.earnedStars}/{course.totalStars}</span>
                    <span>📊 {course.passedCount}/{course.levelCount} 关</span>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <Link
                      href={`/map?course=${course.id}`}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500 transition"
                    >
                      🗺️ 闯关
                    </Link>
                    <Link
                      href={`/leaderboard?course=${course.id}`}
                      className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
                    >
                      🏆 排行
                    </Link>
                    <Link
                      href={`/play/topology/demo?course=${course.id}`}
                      className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
                    >
                      🎮 演示
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform capabilities */}
        <div className="mt-8 grid grid-cols-4 gap-4 text-center">
          {[
            { label: '关卡类型', value: '8种', icon: '🎮' },
            { label: '渲染引擎', value: 'Canvas 2D', icon: '🖼️' },
            { label: '文档解析', value: 'MinerU', icon: '📄' },
            { label: 'AI引擎', value: 'GPT-4o', icon: '🤖' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900/20 p-4">
              <p className="text-2xl">{stat.icon}</p>
              <p className="text-lg font-bold text-gray-200">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-700">
          <p>{tenant.copyright}</p>
        </div>
      </div>

      {/* 上传对话框 */}
      {showImport && (
        <CourseImportDialog
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
