'use client';

/**
 * Showcase / Introduction Page — Minimalist Redesign
 *
 * Design system: #0D1117 base, #58A6FF single accent, Lucide icons,
 * frosted glass, generous whitespace, Inter typography.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Gamepad2,
  Cpu,
  Trophy,
  Map as MapIcon,
  Building2,
  BarChart3,
  Network,
  Shuffle,
  ListOrdered,
  HelpCircle,
  Terminal,
  Search,
  Server,
  GitBranch,
  FileText,
  Zap,
  Monitor,
  Settings,
  Rocket,
  Mail,
  ChevronDown,
  Check,
  Orbit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ───────────────────────── data ───────────────────────── */

const GAME_TYPES: { Icon: LucideIcon; name: string; desc: string }[] = [
  { Icon: Network,     name: '拓扑连线', desc: '拖拽构建网络拓扑图' },
  { Icon: Shuffle,     name: '知识配对', desc: '组件功能一对一匹配' },
  { Icon: ListOrdered, name: '步骤排序', desc: '操作流程正确排序' },
  { Icon: HelpCircle,  name: '选择题',   desc: '知识点快速测验' },
  { Icon: Terminal,    name: '命令行',   desc: '真实CLI命令模拟' },
  { Icon: Search,      name: '故障排查', desc: '场景化排障实战' },
  { Icon: Server,      name: 'VM调度',  desc: '虚拟机智能放置' },
  { Icon: GitBranch,   name: '流程仿真', desc: '分布式系统流程模拟' },
];

const ARCHITECTURE: { layer: string; items: string[]; Icon: LucideIcon }[] = [
  { layer: '前端',     items: ['Next.js 15', 'Canvas 2D', '粒子引擎', 'Tailwind CSS'], Icon: Monitor },
  { layer: '游戏引擎', items: ['状态机', '评分系统', 'Combo追踪', '8种适配器'],        Icon: Gamepad2 },
  { layer: 'API 层',   items: ['NestJS', 'Prisma ORM', 'WebSocket', 'JWT Auth'],     Icon: Settings },
  { layer: 'AI 引擎',  items: ['MinerU 2.5', 'GPT-4o', '文档解析', '题目生成'],       Icon: Cpu },
];

const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Gamepad2,  title: '游戏化学习',  desc: '8种互动关卡类型，告别枯燥PPT培训' },
  { Icon: Cpu,       title: 'AI自动出题',  desc: '上传文档，GPT-4o + MinerU自动生成课程' },
  { Icon: Trophy,    title: '实时排行榜',  desc: 'WebSocket + Redis实时推送排名变化' },
  { Icon: MapIcon,   title: '知识地图',    desc: 'Canvas粒子流DAG图，可视化学习路径' },
  { Icon: Building2, title: 'B2B白标',     desc: '单租户部署，品牌完全自定义' },
  { Icon: BarChart3, title: '数据分析',    desc: '学习进度、掌握率、团队报表' },
  { Icon: Orbit,    title: '数据引力可视化', desc: '物理引擎驱动的数据流动力学实时仿真' },
];

/* ───────────────────── hooks ──────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ───────────────── particle canvas ────────────────── */

function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number }
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const particles: P[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
      a: Math.random() * 0.5 + 0.3,
      hue: Math.random() * 60 + 200, // blue-purple range
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      // connections
      const distSq = 150 * 150;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < distSq) {
            const ratio = 1 - Math.sqrt(d2) / 150;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(220, 80%, 60%, ${0.15 * ratio})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      // particles
      const w = W(), h = H();
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) { p.vx *= -1; p.x = Math.max(0, Math.min(w, p.x)); }
        if (p.y < 0 || p.y > h) { p.vy *= -1; p.y = Math.max(0, Math.min(h, p.y)); }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.a})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
}

/* ─────────────── animated counter ─────────────────── */

function Counter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          setVal(Math.round(end * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─────────────── typewriter effect ─────────────────── */

function Typewriter({ text, speed = 80 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(timer); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse text-accent">|</span>}
    </span>
  );
}

/* ─────────────── workflow section ──────────────────── */

const WORKFLOW_STEPS: { step: string; title: string; desc: string; Icon: LucideIcon; side: 'left' | 'right' }[] = [
  { step: '01', title: '上传文档', desc: 'PDF / Word / TXT 培训资料，支持最大 30 MB', Icon: FileText, side: 'left' },
  { step: '02', title: 'AI 解析', desc: 'MinerU 2.5 智能提取 + GPT-4o 知识点分析', Icon: Cpu, side: 'right' },
  { step: '03', title: '自动生成', desc: '8 种题型关卡自动创建，无需人工编辑', Icon: Zap, side: 'left' },
  { step: '04', title: '员工闯关', desc: 'Canvas 游戏界面，Combo连击 + 星级评价', Icon: Gamepad2, side: 'right' },
  { step: '05', title: '数据洞察', desc: '实时排行榜、学习热力图、掌握率分析', Icon: BarChart3, side: 'left' },
];

function WorkflowStep({ item }: { item: typeof WORKFLOW_STEPS[number] }) {
  const iv = useInView(0.3);
  return (
    <div ref={iv.ref} className={`relative flex items-center mb-12 ${item.side === 'right' ? 'sm:flex-row-reverse' : ''}`}>
      <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent border-[3px] border-base-900 z-10 hidden sm:block" />

      <div className={`w-full sm:w-[calc(50%-2rem)] ${item.side === 'right' ? 'sm:ml-auto sm:pl-8' : 'sm:mr-auto sm:pr-8'}`}>
        <div className={`glass rounded-2xl p-6 transition-all duration-700 ${
          iv.visible
            ? 'opacity-100 translate-x-0'
            : `opacity-0 ${item.side === 'left' ? '-translate-x-12' : 'translate-x-12'}`
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <item.Icon size={24} strokeWidth={1.5} className="text-accent shrink-0" />
            <div>
              <span className="text-xs font-mono text-base-400">STEP {item.step}</span>
              <h3 className="text-base font-semibold text-base-100">{item.title}</h3>
            </div>
          </div>
          <p className="text-sm font-light text-base-300">{item.desc}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-16 text-base-100">
          工作流程
        </h2>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-base-600/40 -translate-x-1/2 hidden sm:block" />
          {WORKFLOW_STEPS.map((item, i) => (
            <WorkflowStep key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ PAGE ══════════════════════════ */

export default function ShowcasePage() {
  const feat = useInView();
  const games = useInView();
  const arch = useInView();
  const stats = useInView();
  const cta = useInView();

  return (
    <div className="relative bg-base-900 text-base-100 overflow-x-hidden">

      {/* ━━━━━━━━━━━━ HERO ━━━━━━━━━━━━ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
        <ParticleHero />
        <div className="absolute inset-0 bg-gradient-to-b from-base-900/60 via-transparent to-base-900 z-[1]" />

        <div className="relative z-10 text-center px-6 max-w-4xl">
          {/* badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/[.08] border border-accent/20 px-5 py-2 text-sm text-base-300">
            <Gamepad2 size={16} strokeWidth={1.5} className="text-accent" />
            游戏化企业培训引擎
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-tight bg-gradient-to-r from-accent to-accent-300 bg-clip-text text-transparent">
            SkillQuest
          </h1>

          <p className="mt-4 text-xl sm:text-2xl text-base-300 font-medium h-8">
            <Typewriter text="游戏化企业培训引擎 — 让技术学习像打游戏一样上瘾" speed={60} />
          </p>

          <p className="mt-6 text-base font-light text-base-400 max-w-2xl mx-auto leading-relaxed">
            上传产品文档 → AI 自动生成 8 种互动关卡 → 员工闯关学习 → 实时排行榜激发竞争<br />
            告别 PPT 培训时代，进入<span className="text-accent font-medium">游戏化认知训练</span>新纪元
          </p>

          <div className="mt-16 animate-bounce">
            <ChevronDown size={24} strokeWidth={1.5} className="mx-auto text-base-500" />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ STATS BANNER ━━━━━━━━━━━━ */}
      <section ref={stats.ref} className="relative py-20 border-y border-base-600/30">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center px-6">
          {[
            { val: 8, suffix: '种', label: '关卡类型' },
            { val: 28, suffix: '+', label: '实训关卡' },
            { val: 100, suffix: '%', label: 'Canvas渲染' },
            { val: 4, suffix: '层', label: '技术架构' },
          ].map((s, i) => (
            <div key={i} className={`transition-all duration-700 ${stats.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              <p className="text-4xl sm:text-5xl font-bold text-accent">
                {stats.visible ? <Counter end={s.val} suffix={s.suffix} /> : `0${s.suffix}`}
              </p>
              <p className="mt-2 text-sm text-base-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━ CORE FEATURES ━━━━━━━━━━━━ */}
      <section ref={feat.ref} className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4 transition-all duration-700 ${feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            七大核心能力
          </h2>
          <p className={`text-center text-base-400 mb-16 transition-all duration-700 delay-200 ${feat.visible ? 'opacity-100' : 'opacity-0'}`}>
            从文档导入到游戏化学习的完整闭环
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`group glass rounded-2xl p-8 transition-all duration-700 hover:border-accent/30 hover:scale-[1.02] ${
                  feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${i * 100 + 300}ms` }}
              >
                <f.Icon size={28} strokeWidth={1.5} className="text-accent mb-5 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-base-100 mb-2">{f.title}</h3>
                <p className="text-sm font-light text-base-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ 8 GAME TYPES ━━━━━━━━━━━━ */}
      <section ref={games.ref} className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4 transition-all duration-700 ${games.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            8 种互动关卡类型
          </h2>
          <p className={`text-center text-base-400 mb-16 transition-all duration-700 delay-200 ${games.visible ? 'opacity-100' : 'opacity-0'}`}>
            每种类型都有独立的 Canvas 2D 渲染引擎 + 游戏适配器
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {GAME_TYPES.map((g, i) => (
              <div
                key={i}
                className={`group glass rounded-2xl p-6 text-center transition-all duration-700 hover:scale-105 hover:border-accent/30 ${
                  games.visible ? 'opacity-100 translate-y-0 rotate-0' : 'opacity-0 translate-y-12 rotate-3'
                }`}
                style={{ transitionDelay: `${i * 80 + 300}ms` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/[.08] mb-4 group-hover:scale-110 transition-transform">
                  <g.Icon size={24} strokeWidth={1.5} className="text-accent" />
                </div>
                <h3 className="text-base font-semibold text-base-100">{g.name}</h3>
                <p className="mt-1 text-xs text-base-400">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ WORKFLOW ━━━━━━━━━━━━ */}
      <WorkflowSection />

      {/* ━━━━━━━━━━━━ ARCHITECTURE ━━━━━━━━━━━━ */}
      <section ref={arch.ref} className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-16 transition-all duration-700 ${arch.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            四层技术架构
          </h2>

          <div className="space-y-3">
            {ARCHITECTURE.map((layer, i) => (
              <div
                key={i}
                className={`glass rounded-2xl p-6 transition-all duration-700 ${
                  arch.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                }`}
                style={{ transitionDelay: `${i * 200 + 200}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="flex items-center gap-2 text-base font-semibold text-base-100 min-w-[8rem]">
                    <layer.Icon size={18} strokeWidth={1.5} className="text-accent" />
                    {layer.layer}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {layer.items.map((item, j) => (
                      <span key={j} className="px-3 py-1 rounded-full text-xs font-medium bg-accent/[.06] text-base-300 border border-accent/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {i < ARCHITECTURE.length - 1 && (
                  <div className="flex justify-center mt-3">
                    <ChevronDown size={18} strokeWidth={1.5} className="text-base-500 animate-bounce" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ COMPARISON ━━━━━━━━━━━━ */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-16 text-base-100">
            传统培训 vs SkillQuest
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* old way */}
            <div className="rounded-2xl border border-red-500/10 bg-red-950/[.04] p-8">
              <h3 className="text-lg font-semibold text-base-200 mb-6">传统 PPT 培训</h3>
              <ul className="space-y-3 text-sm text-base-400">
                {[
                  '枯燥的 PPT 幻灯片',
                  '学员注意力难以集中',
                  '纸质考试效率低',
                  '无法追踪学习效果',
                  '出题需要大量人工',
                  '内容更新困难',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-base-500">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* new way */}
            <div className="rounded-2xl border border-accent/10 bg-accent/[.03] p-8">
              <h3 className="text-lg font-semibold text-base-100 mb-6">SkillQuest 游戏化</h3>
              <ul className="space-y-3 text-sm text-base-200">
                {[
                  '8种互动游戏关卡',
                  'Combo连击激发学习欲望',
                  'AI自动从文档生成题目',
                  '实时数据分析和排行榜',
                  'GPT-4o + MinerU智能出题',
                  '上传文档即刻更新课程',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} strokeWidth={2} className="text-accent mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ CTA ━━━━━━━━━━━━ */}
      <section ref={cta.ref} className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-accent/[.06] blur-[120px]" />
        </div>

        <div className={`relative z-10 text-center max-w-3xl mx-auto transition-all duration-1000 ${cta.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 text-base-100">
            准备好革新你的培训方式了吗？
          </h2>
          <p className="text-lg font-light text-base-300 mb-10 leading-relaxed">
            SkillQuest 是通用游戏化培训引擎，可以部署为任何企业的品牌培训平台。<br />
            只需上传你的培训文档，AI 就能自动生成完整的游戏化课程。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent text-base-900 font-semibold text-base hover:bg-accent-300 transition-all hover:scale-105"
            >
              <Rocket size={18} strokeWidth={1.5} />
              进入平台体验
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-base-600/60 text-base-300 font-semibold text-base hover:border-accent/30 hover:bg-accent/[.05] transition-all hover:scale-105"
            >
              <Mail size={18} strokeWidth={1.5} />
              课程管理后台
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━ */}
      <footer className="py-10 border-t border-base-600/30 text-center text-xs text-base-500">
        <p>SkillQuest — 通用游戏化企业培训引擎</p>
        <p className="mt-1">Next.js 15 · Canvas 2D · NestJS · Prisma · MinerU 2.5 · GPT-4o</p>
        <p className="mt-2 text-base-600">© 2026 SmartX Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
