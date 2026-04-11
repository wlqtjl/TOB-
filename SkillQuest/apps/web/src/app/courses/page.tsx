/**
 * 课程管理页面 — 展示所有可用课程
 *
 * Phase 1: 静态课程列表 (从共享数据层读取)
 * Phase 2: 接入API + AI题目生成 + 文档上传
 */

import Link from 'next/link';
import { COURSES } from '../../lib/mock-courses';

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-200">⚙️ 课程管理</h1>
            <p className="text-sm text-gray-500">
              当前已配置 {COURSES.length} 门课程 · 支持任意厂商
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            ← 返回首页
          </Link>
        </div>

        {/* AI上传提示 (Phase 2) */}
        <div className="mb-6 rounded-xl border border-dashed border-blue-500/30 bg-blue-950/10 p-6 text-center">
          <p className="text-lg text-blue-300">📄 上传培训文档自动生成课程</p>
          <p className="mt-2 text-sm text-gray-500">
            支持 PDF / PPT / Word — AI自动提取知识点并生成7种题型关卡
          </p>
          <p className="mt-1 text-xs text-gray-600">
            （深信服超融合安装文档 · 安超云实施手册 · 华为认证教材 — 全部支持）
          </p>
          <button
            className="mt-4 rounded-lg bg-blue-600/50 px-6 py-2 text-sm text-blue-300 cursor-not-allowed"
            disabled
          >
            📤 上传文档 (Phase 2 — AI Engine 开发中)
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
                        {course.vendor}
                      </span>
                      <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                        {course.category}
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

        {/* Platform stats */}
        <div className="mt-8 grid grid-cols-4 gap-4 text-center">
          {[
            { label: '支持厂商', value: '3+', icon: '🏢' },
            { label: '关卡类型', value: '7种', icon: '🎮' },
            { label: '渲染引擎', value: 'Canvas 2D', icon: '🖼️' },
            { label: 'AI引擎', value: 'GPT-4o', icon: '🤖' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900/20 p-4">
              <p className="text-2xl">{stat.icon}</p>
              <p className="text-lg font-bold text-gray-200">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
