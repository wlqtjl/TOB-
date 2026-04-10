import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* 品牌标识 */}
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-brand-400 to-game-gold bg-clip-text text-transparent">
          SkillQuest
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          游戏化产品技能培训平台 — 对标 Data Center 级炫酷效果
        </p>
      </div>

      {/* 入口导航 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl w-full">
        <Link
          href="/map"
          className="group rounded-xl border border-brand-700/50 bg-brand-950/50 p-6 transition hover:border-brand-500 hover:bg-brand-900/30"
        >
          <h2 className="text-xl font-semibold text-brand-300 group-hover:text-brand-200">
            🗺️ 闯关地图
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Phaser.js 粒子流动画 · 知识DAG图
          </p>
        </Link>

        <Link
          href="/leaderboard"
          className="group rounded-xl border border-game-gold/30 bg-yellow-950/20 p-6 transition hover:border-game-gold/60 hover:bg-yellow-900/20"
        >
          <h2 className="text-xl font-semibold text-yellow-300 group-hover:text-yellow-200">
            🏆 实时排行榜
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            WebSocket 实时推送 · Redis Sorted Set
          </p>
        </Link>

        <Link
          href="/courses"
          className="group rounded-xl border border-gray-700/50 bg-gray-900/50 p-6 transition hover:border-gray-500 hover:bg-gray-800/30"
        >
          <h2 className="text-xl font-semibold text-gray-300 group-hover:text-gray-100">
            ⚙️ 管理后台
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            课程管理 · AI题目生成 · 数据分析
          </p>
        </Link>
      </div>

      {/* 技术栈标签 */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        {['Next.js 14', 'NestJS', 'Phaser.js', 'PixiJS Particles', 'Redis', 'PostgreSQL', 'FastAPI', 'GPT-4o'].map((tech) => (
          <span key={tech} className="rounded-full border border-gray-800 px-3 py-1">
            {tech}
          </span>
        ))}
      </div>
    </main>
  );
}
