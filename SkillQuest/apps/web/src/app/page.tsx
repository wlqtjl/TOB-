/**
 * Homepage — Immersive Data Center Adventure Entry
 *
 * Transformed from cold course list to immersive crisis narrative.
 * Design: Dark theme data center feel with crisis urgency.
 */

import Link from 'next/link';
import {
  Star,
  BarChart3,
  Map,
  Trophy,
  Settings,
  Presentation,
  Orbit,
  Award,
  User,
  LineChart,
  GitBranch,
  ClipboardCheck,
  FolderUp,
  LogIn,
  UsersRound,
  Gamepad2,
  AlertTriangle,
  Server,
  Zap,
  Timer,
  Shield,
} from 'lucide-react';
import { COURSES } from '../lib/mock-courses';
import { tenantConfig } from '../lib/tenant-config';
import HeroSection from '../components/home/HeroSection';
import InteractionModesGrid from '../components/home/InteractionModesGrid';
import Reveal from '../components/home/Reveal';
import CountUp from '../components/home/CountUp';
import AmbientBackdrop from '../components/home/AmbientBackdrop';

const tenant = tenantConfig();

export default function Home() {
  const activeCourses = COURSES;
  const totalLevels = activeCourses.reduce((s, c) => s + c.levelCount, 0);
  const totalPassed = activeCourses.reduce((s, c) => s + c.passedCount, 0);
  const totalStars = activeCourses.reduce((s, c) => s + c.earnedStars, 0);
  const maxStars = activeCourses.reduce((s, c) => s + c.totalStars, 0);

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-12 px-6 py-8 md:px-8 md:py-12">
      <AmbientBackdrop />

      {/* ── Dynamic Hero with particle flow ── */}
      <div className="w-full max-w-6xl">
        <HeroSection
          platformName={tenant.platformName}
          tagline={tenant.tagline}
          welcomeMessage={tenant.welcomeMessage}
          stats={{
            courses: activeCourses.length,
            levels: totalLevels,
            passed: totalPassed,
            stars: totalStars,
            maxStars,
          }}
        />
      </div>

      {/* ── 5 Interaction modes showcase grid ── */}
      <Reveal className="w-full flex justify-center">
        <InteractionModesGrid />
      </Reveal>

      {/* ── Crisis Alert Banner ── */}
      <Reveal className="w-full flex justify-center">
        <Link
          href="/crisis"
          className="crisis-scan group relative w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-6 transition-all hover:border-red-400 hover:shadow-lg hover:shadow-red-100"
        >
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 text-red-600 group-hover:bg-red-200 transition">
              <AlertTriangle size={28} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-red-900">数据中心危机模拟器</h2>
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700/70">
                核心服务离线，<CountUp value={50000} durationMs={1600} live liveJitter={30} liveIntervalMs={2000} /> 用户受影响 — 以救援工程师身份接入紧急任务
              </p>
            </div>
            <div className="text-red-400 group-hover:text-red-600 transition">
              <Server size={24} />
            </div>
          </div>
        </Link>
      </Reveal>

      {/* ── Quick Actions: Sprint + Leaderboard ── */}
      <Reveal className="w-full flex justify-center">
        <div className="grid w-full max-w-3xl grid-cols-2 gap-4">
          <Link
            href="/sprint"
            className="group rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Timer size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">5 分钟冲刺</h3>
                <p className="text-xs text-amber-700/60">碎片时间 · 快速提分</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Zap size={12} />
              <span>Duolingo 风格极速闯关</span>
            </div>
          </Link>

          <Link
            href="/leaderboard"
            className="group rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Trophy size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">实时排行榜</h3>
                <p className="text-xs text-blue-700/60">部门榜 · 周榜 · 连胜榜</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
              <Shield size={12} />
              <span>实时推送排名变动通知</span>
            </div>
          </Link>
        </div>
      </Reveal>

      {/* ── Stats already shown in Hero; keeping Quick Actions below ── */}

      {/* ── Course List — Mission Cards ── */}
      <div className="w-full max-w-3xl">
        <h2 className="mb-4 text-sm font-medium text-base-400">🎯 救援任务</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeCourses.map((course, idx) => {
            const progress = course.levelCount > 0 ? course.passedCount / course.levelCount : 0;
            return (
              <Reveal key={course.id} delayMs={idx * 60}>
                <Link
                  href={`/map?course=${course.id}`}
                  className="group block rounded-xl border border-base-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)]"
                >
                  <h3 className="text-base font-semibold text-base-900 group-hover:text-accent transition-colors">
                    {course.title}
                  </h3>
                  <span className="mt-0.5 text-xs text-base-400">{course.category}</span>
                  <p className="mt-2 text-sm font-light leading-relaxed text-base-600">
                    {course.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-base-400">
                    <span className="flex items-center gap-1">
                      <Star size={12} strokeWidth={1.5} />
                      {course.earnedStars}/{course.totalStars}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 size={12} strokeWidth={1.5} />
                      {course.passedCount}/{course.levelCount} 关
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-base-100">
                    <div
                      className="progress-bar-fill h-full w-full rounded-full bg-accent/60"
                      style={{ '--progress': progress } as React.CSSProperties}
                    />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* ── Nav Entries ── */}
      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: '/map', label: '闯关地图', desc: 'Canvas 粒子流 · 知识DAG图', Icon: Map },
          { href: '/leaderboard', label: '实时排行榜', desc: '员工 · 团队排名', Icon: Trophy },
          { href: '/courses', label: '课程列表', desc: '内容管理 · AI题目生成', Icon: Settings },
          { href: '/admin/dashboard', label: '数据看板', desc: '统计分析 · 数据导出', Icon: BarChart3 },
          { href: '/admin/review', label: '审核中心', desc: 'AI题目审核 · 双Agent对比', Icon: ClipboardCheck },
          { href: '/admin/courses', label: '课程管理', desc: '文档上传 · AI生成', Icon: FolderUp },
          { href: '/admin/partners', label: '团队管理', desc: '员工进度 · 课程分配', Icon: UsersRound },
          { href: '/login', label: '登录', desc: '用户认证 · 权限管理', Icon: LogIn },
          { href: '/showcase', label: '产品介绍', desc: '动态展示 · 平台亮点', Icon: Presentation },
          { href: '/data-gravity', label: '数据引力场', desc: '物理可视化 · 数据流动', Icon: Orbit },
          { href: '/data-gravity/story', label: 'ZBS 数据流', desc: '五场景叙事 · 交互学习', Icon: Presentation },
          { href: '/play/scenario_decision/demo?course=smartx-halo', label: '情景选择关', desc: '角色扮演 · 决策训练', Icon: Gamepad2 },
          { href: '/achievements', label: '成就徽章墙', desc: '隐藏成就 · 稀有徽章', Icon: Award },
          { href: '/profile', label: 'Profile', desc: 'Stats / Skills / Progress', Icon: User },
          { href: '/analytics', label: 'Analytics', desc: 'Reports / Insights / ROI', Icon: LineChart },
          { href: '/learning-path', label: 'Learning Path', desc: 'Skill Tree / Recommendations', Icon: GitBranch },
          { href: '/sprint', label: '冲刺模式', desc: '5分钟快速提分', Icon: Timer },
          { href: '/crisis', label: '危机模拟', desc: '沉浸式救援任务', Icon: AlertTriangle },
        ].map((item, idx) => (
          <Reveal key={item.href} delayMs={idx * 30}>
            <Link
              href={item.href}
              className="group block rounded-xl border border-base-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)]"
            >
              <item.Icon size={20} strokeWidth={1.5} className="text-base-400 group-hover:text-accent transition-colors" />
              <h2 className="mt-3 text-sm font-semibold text-base-900 group-hover:text-accent transition-colors">
                {item.label}
              </h2>
              <p className="mt-1 text-xs text-base-400">{item.desc}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-base-400 space-y-1">
        <p>{tenant.copyright}</p>
        <p>Powered by SkillQuest 通用游戏化培训引擎</p>
      </div>
    </main>
  );
}
