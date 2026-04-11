import Link from 'next/link';
import { COURSES } from '../lib/mock-courses';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* 品牌标识 */}
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-400 to-game-gold bg-clip-text text-transparent">
          SkillQuest
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          通用游戏化产品技能培训平台
        </p>
        <p className="mt-1 text-sm text-gray-600">
          支持华为 · 深信服 · 安超云 · 锐捷 · SmartX 等任意厂商课程
        </p>
      </div>

      {/* 多厂商课程卡片 */}
      <div className="w-full max-w-4xl">
        <h2 className="text-sm font-medium text-gray-500 mb-3">📚 选择课程开始闯关</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COURSES.map((course) => (
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
                  <span className="text-xs text-gray-600">{course.vendor}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">{course.description}</p>
              <div className="mt-3 flex gap-3 text-xs text-gray-600">
                <span>⭐ {course.earnedStars}/{course.totalStars}</span>
                <span>📊 {course.passedCount}/{course.levelCount} 关</span>
                <span>🔥 XP {course.xp}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 功能入口 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl w-full">
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
          <p className="mt-1 text-sm text-gray-500">WebSocket · Redis Sorted Set</p>
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
      </div>

      {/* 技术栈标签 */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        {['Next.js 15', 'NestJS', 'Canvas 2D Particles', 'Redis', 'PostgreSQL', 'FastAPI', 'GPT-4o'].map((tech) => (
          <span key={tech} className="rounded-full border border-gray-800 px-3 py-1">
            {tech}
          </span>
        ))}
      </div>
    </main>
  );
}
