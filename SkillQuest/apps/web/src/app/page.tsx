import Link from 'next/link';
import { COURSES } from '../lib/mock-courses';
import { tenantConfig } from '../lib/tenant-config';

const tenant = tenantConfig();

export default function Home() {
  // In a B2B single-tenant deployment, all courses belong to this tenant
  const activeCourses = COURSES;
  const totalLevels = activeCourses.reduce((s, c) => s + c.levelCount, 0);
  const totalPassed = activeCourses.reduce((s, c) => s + c.passedCount, 0);
  const totalStars = activeCourses.reduce((s, c) => s + c.earnedStars, 0);
  const maxStars = activeCourses.reduce((s, c) => s + c.totalStars, 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* 品牌标识 — 显示部署厂商的品牌 */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.companyName} className="h-12" />
          ) : (
            <span className="text-5xl">{tenant.icon}</span>
          )}
          <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-400 to-game-gold bg-clip-text text-transparent">
            {tenant.platformName}
          </h1>
        </div>
        <p className="mt-3 text-lg text-gray-400">
          {tenant.tagline}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {tenant.welcomeMessage}
        </p>
      </div>

      {/* 学习概览 */}
      <div className="grid grid-cols-4 gap-4 text-center max-w-3xl w-full">
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
          <p className="text-2xl font-bold text-blue-300">{activeCourses.length}</p>
          <p className="text-xs text-gray-500">培训课程</p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4">
          <p className="text-2xl font-bold text-yellow-300">{totalLevels}</p>
          <p className="text-xs text-gray-500">实训关卡</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4">
          <p className="text-2xl font-bold text-green-300">{totalPassed}/{totalLevels}</p>
          <p className="text-xs text-gray-500">已通关</p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4">
          <p className="text-2xl font-bold text-orange-300">⭐ {totalStars}/{maxStars}</p>
          <p className="text-xs text-gray-500">获得星数</p>
        </div>
      </div>

      {/* 课程列表 — 单个厂商的课程目录 */}
      <div className="w-full max-w-4xl">
        <h2 className="text-sm font-medium text-gray-500 mb-3">📚 我的培训课程</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeCourses.map((course) => (
            <Link
              key={course.id}
              href={`/map?course=${course.id}`}
              className="group rounded-xl border border-brand-700/50 bg-brand-950/50 p-6 transition hover:border-brand-500 hover:bg-brand-900/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{course.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-brand-300 group-hover:text-brand-200">
                    {course.title}
                  </h3>
                  <span className="text-xs text-gray-600">{course.category}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">{course.description}</p>
              <div className="mt-3 flex gap-3 text-xs text-gray-600">
                <span>⭐ {course.earnedStars}/{course.totalStars}</span>
                <span>📊 {course.passedCount}/{course.levelCount} 关</span>
                <span>🔥 XP {course.xp}</span>
              </div>
              {/* 进度条 */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.round((course.passedCount / course.levelCount) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 功能入口 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 max-w-4xl w-full">
        <Link
          href="/map"
          className="group rounded-xl border border-brand-700/50 bg-brand-950/50 p-5 transition hover:border-brand-500 hover:bg-brand-900/30"
        >
          <h2 className="text-lg font-semibold text-brand-300 group-hover:text-brand-200">
            🗺️ 闯关地图
          </h2>
          <p className="mt-1 text-sm text-gray-500">Canvas 粒子流 · 知识DAG图</p>
        </Link>

        <Link
          href="/leaderboard"
          className="group rounded-xl border border-game-gold/30 bg-yellow-950/20 p-5 transition hover:border-game-gold/60 hover:bg-yellow-900/20"
        >
          <h2 className="text-lg font-semibold text-yellow-300 group-hover:text-yellow-200">
            🏆 实时排行榜
          </h2>
          <p className="mt-1 text-sm text-gray-500">员工 · 代理商 · 团队排名</p>
        </Link>

        <Link
          href="/courses"
          className="group rounded-xl border border-gray-700/50 bg-gray-900/50 p-5 transition hover:border-gray-500 hover:bg-gray-800/30"
        >
          <h2 className="text-lg font-semibold text-gray-300 group-hover:text-gray-100">
            ⚙️ 课程管理
          </h2>
          <p className="mt-1 text-sm text-gray-500">内容管理 · AI题目生成</p>
        </Link>

        <Link
          href="/showcase"
          className="group rounded-xl border border-purple-700/50 bg-purple-950/20 p-5 transition hover:border-purple-500 hover:bg-purple-900/30"
        >
          <h2 className="text-lg font-semibold text-purple-300 group-hover:text-purple-200">
            🎬 产品介绍
          </h2>
          <p className="mt-1 text-sm text-gray-500">动态展示 · 平台亮点</p>
        </Link>
      </div>

      {/* 底部品牌信息 */}
      <div className="text-center text-xs text-gray-700 space-y-1">
        <p>{tenant.copyright}</p>
        <p>Powered by SkillQuest 通用游戏化培训引擎</p>
      </div>
    </main>
  );
}
