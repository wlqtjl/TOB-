'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ───────────────────────── data ───────────────────────── */

const GAME_TYPES = [
  { icon: '🔗', name: '拓扑连线', desc: '拖拽构建网络拓扑图', color: 'from-blue-500 to-cyan-400' },
  { icon: '🔀', name: '知识配对', desc: '组件功能一对一匹配', color: 'from-purple-500 to-pink-400' },
  { icon: '📋', name: '步骤排序', desc: '操作流程正确排序', color: 'from-green-500 to-emerald-400' },
  { icon: '📝', name: '选择题', desc: '知识点快速测验', color: 'from-yellow-500 to-orange-400' },
  { icon: '💻', name: '命令行', desc: '真实CLI命令模拟', color: 'from-gray-400 to-gray-300' },
  { icon: '🔍', name: '故障排查', desc: '场景化排障实战', color: 'from-red-500 to-rose-400' },
  { icon: '🖥️', name: 'VM调度', desc: '虚拟机智能放置', color: 'from-indigo-500 to-violet-400' },
  { icon: '🔄', name: '流程仿真', desc: '分布式系统流程模拟', color: 'from-teal-500 to-cyan-400' },
];

const ARCHITECTURE = [
  { layer: '前端', items: ['Next.js 15', 'Canvas 2D', '粒子引擎', 'Tailwind CSS'], color: 'border-blue-500/60 bg-blue-950/40' },
  { layer: '游戏引擎', items: ['状态机', '评分系统', 'Combo追踪', '8种适配器'], color: 'border-purple-500/60 bg-purple-950/40' },
  { layer: 'API 层', items: ['NestJS', 'Prisma ORM', 'WebSocket', 'JWT Auth'], color: 'border-green-500/60 bg-green-950/40' },
  { layer: 'AI 引擎', items: ['MinerU 2.5', 'GPT-4o', '文档解析', '题目生成'], color: 'border-orange-500/60 bg-orange-950/40' },
];

const FEATURES = [
  { icon: '🎮', title: '游戏化学习', desc: '8种互动关卡类型，告别枯燥PPT培训' },
  { icon: '🤖', title: 'AI自动出题', desc: '上传文档，GPT-4o + MinerU自动生成课程' },
  { icon: '🏆', title: '实时排行榜', desc: 'WebSocket + Redis实时推送排名变化' },
  { icon: '🗺️', title: '知识地图', desc: 'Canvas粒子流DAG图，可视化学习路径' },
  { icon: '🏢', title: 'B2B白标', desc: '单租户部署，品牌完全自定义' },
  { icon: '📊', title: '数据分析', desc: '学习进度、掌握率、团队报表' },
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
      {!done && <span className="animate-pulse text-blue-400">|</span>}
    </span>
  );
}

/* ─────────────── workflow section ──────────────────── */

const WORKFLOW_STEPS = [
  { step: '01', title: '上传文档', desc: 'PDF / Word / TXT 培训资料，支持最大 30 MB', icon: '📄', side: 'left' as const },
  { step: '02', title: 'AI 解析', desc: 'MinerU 2.5 智能提取 + GPT-4o 知识点分析', icon: '🤖', side: 'right' as const },
  { step: '03', title: '自动生成', desc: '8 种题型关卡自动创建，无需人工编辑', icon: '⚡', side: 'left' as const },
  { step: '04', title: '员工闯关', desc: 'Canvas 游戏界面，Combo连击 + 星级评价', icon: '🎮', side: 'right' as const },
  { step: '05', title: '数据洞察', desc: '实时排行榜、学习热力图、掌握率分析', icon: '📊', side: 'left' as const },
];

function WorkflowStep({ item }: { item: typeof WORKFLOW_STEPS[number] }) {
  const iv = useInView(0.3);
  return (
    <div ref={iv.ref} className={`relative flex items-center mb-12 ${item.side === 'right' ? 'sm:flex-row-reverse' : ''}`}>
      {/* dot on line */}
      <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-950 z-10 hidden sm:block" />

      <div className={`w-full sm:w-[calc(50%-2rem)] ${item.side === 'right' ? 'sm:ml-auto sm:pl-8' : 'sm:mr-auto sm:pr-8'}`}>
        <div className={`rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-700 ${
          iv.visible
            ? 'opacity-100 translate-x-0'
            : `opacity-0 ${item.side === 'left' ? '-translate-x-12' : 'translate-x-12'}`
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{item.icon}</span>
            <div>
              <span className="text-xs font-mono text-blue-400">STEP {item.step}</span>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
            </div>
          </div>
          <p className="text-sm text-gray-400">{item.desc}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            工作流程
          </span>
        </h2>

        <div className="relative">
          {/* center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/60 via-purple-500/60 to-green-500/60 -translate-x-1/2 hidden sm:block" />
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
    <div className="relative bg-gray-950 text-white overflow-x-hidden">

      {/* ━━━━━━━━━━━━ HERO ━━━━━━━━━━━━ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
        <ParticleHero />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-transparent to-gray-950 z-[1]" />

        <div className="relative z-10 text-center px-6 max-w-4xl">
          {/* logo pulse */}
          <div className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-blue-600/20 border border-blue-500/40 animate-[pulse_3s_ease-in-out_infinite]">
            <span className="text-6xl">🎮</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              SkillQuest
            </span>
          </h1>

          <p className="mt-4 text-xl sm:text-2xl text-gray-300 font-medium h-8">
            <Typewriter text="游戏化企业培训引擎 — 让技术学习像打游戏一样上瘾" speed={60} />
          </p>

          <p className="mt-6 text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
            上传产品文档 → AI 自动生成 8 种互动关卡 → 员工闯关学习 → 实时排行榜激发竞争<br />
            告别 PPT 培训时代，进入<span className="text-blue-400 font-semibold">游戏化认知训练</span>新纪元
          </p>

          {/* scroll indicator */}
          <div className="mt-16 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ STATS BANNER ━━━━━━━━━━━━ */}
      <section ref={stats.ref} className="relative py-16 bg-gradient-to-r from-blue-950/50 via-purple-950/50 to-blue-950/50 border-y border-blue-500/20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center px-6">
          {[
            { val: 8, suffix: '种', label: '关卡类型' },
            { val: 28, suffix: '+', label: '实训关卡' },
            { val: 100, suffix: '%', label: 'Canvas渲染' },
            { val: 4, suffix: '层', label: '技术架构' },
          ].map((s, i) => (
            <div key={i} className={`transition-all duration-700 ${stats.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              <p className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                {stats.visible ? <Counter end={s.val} suffix={s.suffix} /> : `0${s.suffix}`}
              </p>
              <p className="mt-2 text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━ CORE FEATURES ━━━━━━━━━━━━ */}
      <section ref={feat.ref} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-4 transition-all duration-700 ${feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              六大核心能力
            </span>
          </h2>
          <p className={`text-center text-gray-500 mb-16 transition-all duration-700 delay-200 ${feat.visible ? 'opacity-100' : 'opacity-0'}`}>
            从文档导入到游戏化学习的完整闭环
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 transition-all duration-700 hover:border-blue-500/50 hover:bg-blue-950/20 hover:scale-[1.02] ${
                  feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${i * 100 + 300}ms` }}
              >
                <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">{f.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                {/* glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ 8 GAME TYPES ━━━━━━━━━━━━ */}
      <section ref={games.ref} className="py-24 px-6 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-4 transition-all duration-700 ${games.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              8 种互动关卡类型
            </span>
          </h2>
          <p className={`text-center text-gray-500 mb-16 transition-all duration-700 delay-200 ${games.visible ? 'opacity-100' : 'opacity-0'}`}>
            每种类型都有独立的 Canvas 2D 渲染引擎 + 游戏适配器
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {GAME_TYPES.map((g, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 text-center transition-all duration-700 hover:scale-105 ${
                  games.visible ? 'opacity-100 translate-y-0 rotate-0' : 'opacity-0 translate-y-12 rotate-3'
                }`}
                style={{ transitionDelay: `${i * 80 + 300}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${g.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <span className="text-3xl">{g.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{g.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ WORKFLOW ━━━━━━━━━━━━ */}
      <WorkflowSection />

      {/* ━━━━━━━━━━━━ ARCHITECTURE ━━━━━━━━━━━━ */}
      <section ref={arch.ref} className="py-24 px-6 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl font-bold text-center mb-16 transition-all duration-700 ${arch.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              四层技术架构
            </span>
          </h2>

          <div className="space-y-4">
            {ARCHITECTURE.map((layer, i) => (
              <div
                key={i}
                className={`rounded-2xl border ${layer.color} p-6 transition-all duration-700 ${
                  arch.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                }`}
                style={{ transitionDelay: `${i * 200 + 200}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="text-lg font-bold text-white min-w-[7rem]">
                    {['🖥️', '🎮', '⚙️', '🤖'][i]} {layer.layer}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {layer.items.map((item, j) => (
                      <span key={j} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300 border border-white/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {/* animated connection arrow */}
                {i < ARCHITECTURE.length - 1 && (
                  <div className="flex justify-center mt-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="text-gray-600 animate-bounce">
                      <path d="M10 4 L10 14 M6 10 L10 14 L14 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ COMPARISON ━━━━━━━━━━━━ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              传统培训 vs SkillQuest
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* old way */}
            <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-8">
              <h3 className="text-xl font-bold text-red-400 mb-6">❌ 传统 PPT 培训</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                {[
                  '📽️ 枯燥的 PPT 幻灯片',
                  '😴 学员注意力难以集中',
                  '📝 纸质考试效率低',
                  '📊 无法追踪学习效果',
                  '⏰ 出题需要大量人工',
                  '🔄 内容更新困难',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500/60">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* new way */}
            <div className="rounded-2xl border border-green-500/30 bg-green-950/10 p-8">
              <h3 className="text-xl font-bold text-green-400 mb-6">✅ SkillQuest 游戏化</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                {[
                  '🎮 8种互动游戏关卡',
                  '🔥 Combo连击激发学习欲望',
                  '⚡ AI自动从文档生成题目',
                  '📊 实时数据分析和排行榜',
                  '🤖 GPT-4o + MinerU智能出题',
                  '📄 上传文档即刻更新课程',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
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
        {/* background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className={`relative z-10 text-center max-w-3xl mx-auto transition-all duration-1000 ${cta.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              准备好革新你的培训方式了吗？
            </span>
          </h2>
          <p className="text-lg text-gray-400 mb-10 leading-relaxed">
            SkillQuest 是通用游戏化培训引擎，可以部署为任何企业的品牌培训平台。<br />
            只需上传你的培训文档，AI 就能自动生成完整的游戏化课程。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:from-blue-500 hover:to-purple-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              🚀 进入平台体验
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-gray-700 bg-gray-900/50 text-gray-300 font-bold text-lg hover:border-blue-500/50 hover:bg-blue-950/20 transition-all hover:scale-105"
            >
              ⚙️ 课程管理后台
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━ */}
      <footer className="py-8 border-t border-gray-800 text-center text-xs text-gray-600">
        <p>SkillQuest — 通用游戏化企业培训引擎</p>
        <p className="mt-1">Next.js 15 · Canvas 2D · NestJS · Prisma · MinerU 2.5 · GPT-4o</p>
      </footer>
    </div>
  );
}
