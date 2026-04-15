/**
 * Homepage — Light minimalist design (Linear/Stripe style)
 *
 * Design: #F9FAFB surface, single accent (Indigo #4F46E5),
 * 8px grid, 1px borders, Lucide icons only.
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
} from 'lucide-react';
import { COURSES } from '../lib/mock-courses';
import { tenantConfig } from '../lib/tenant-config';

const tenant = tenantConfig();

export default function Home() {
  const activeCourses = COURSES;
  const totalLevels = activeCourses.reduce((s, c) => s + c.levelCount, 0);
  const totalPassed = activeCourses.reduce((s, c) => s + c.passedCount, 0);
  const totalStars = activeCourses.reduce((s, c) => s + c.earnedStars, 0);
  const maxStars = activeCourses.reduce((s, c) => s + c.totalStars, 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-8 py-16">
      {/* ── Brand ── */}
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-base-900">
          {tenant.platformName}
        </h1>
        <p className="mt-3 text-base font-light text-base-600">
          {tenant.tagline}
        </p>
        <p className="mt-1 text-sm text-base-400">
          {tenant.welcomeMessage}
        </p>
      </div>

      {/* ── Stats — clean grid ── */}
      <div className="grid w-full max-w-2xl grid-cols-4 gap-4 text-center">
        {[
          { label: '培训课程', value: activeCourses.length },
          { label: '实训关卡', value: totalLevels },
          { label: '已通关', value: `${totalPassed}/${totalLevels}` },
          { label: '星数', value: `${totalStars}/${maxStars}` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-base-200 bg-white px-4 py-5"
          >
            <p className="text-xl font-semibold text-base-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-base-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Course List ── */}
      <div className="w-full max-w-3xl">
        <h2 className="mb-4 text-sm font-medium text-base-400">我的培训课程</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeCourses.map((course) => (
            <Link
              key={course.id}
              href={`/map?course=${course.id}`}
              className="group rounded-xl border border-base-200 bg-white p-6 transition-all hover:border-accent/40"
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
                  className="h-full rounded-full bg-accent/60 transition-all"
                  style={{ width: `${Math.round((course.passedCount / course.levelCount) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
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
          { href: '/achievements', label: 'Achievements', desc: 'Badges / Level / Milestones', Icon: Award },
          { href: '/profile', label: 'Profile', desc: 'Stats / Skills / Progress', Icon: User },
          { href: '/analytics', label: 'Analytics', desc: 'Reports / Insights / ROI', Icon: LineChart },
          { href: '/learning-path', label: 'Learning Path', desc: 'Skill Tree / Recommendations', Icon: GitBranch },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-base-200 bg-white p-5 transition-all hover:border-accent/40"
          >
            <item.Icon size={20} strokeWidth={1.5} className="text-base-400 group-hover:text-accent transition-colors" />
            <h2 className="mt-3 text-sm font-semibold text-base-900 group-hover:text-accent transition-colors">
              {item.label}
            </h2>
            <p className="mt-1 text-xs text-base-400">{item.desc}</p>
          </Link>
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
