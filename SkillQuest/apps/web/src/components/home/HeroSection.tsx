/**
 * HeroSection — 首页动态 Hero（粒子流背景 + 立体文案 + CTA）
 *
 * 仅前端；使用 HeroParticleFlow 作为背景，CSS fade-in 渐入动画避免首屏闪动。
 */

'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Play } from 'lucide-react';
import HeroParticleFlow from './HeroParticleFlow';
import Typewriter from './Typewriter';
import CountUp from './CountUp';
import LiveMetricBadge from './LiveMetricBadge';

interface HeroSectionProps {
  platformName: string;
  tagline: string;
  welcomeMessage: string;
  stats: {
    courses: number;
    levels: number;
    passed: number;
    stars: number;
    maxStars: number;
  };
}

export default function HeroSection({
  platformName,
  tagline,
  welcomeMessage,
  stats,
}: HeroSectionProps) {
  return (
    <section className="relative isolate w-full overflow-hidden rounded-3xl border border-base-200 bg-[#0D1117] text-white shadow-xl">
      {/* Particle canvas */}
      <div className="absolute inset-0">
        <HeroParticleFlow />
      </div>

      {/* Gradient overlays for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#0D1117]/10 to-[#0D1117]/60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0D1117]/60 via-transparent to-[#0D1117]/30"
      />

      {/* Content */}
      <div className="relative flex min-h-[520px] flex-col items-start justify-center gap-6 px-8 py-20 md:px-16">
        <LiveMetricBadge />

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl hero-fade-in-up">
          <span className="bg-gradient-to-r from-white via-blue-100 to-sky-300 bg-clip-text text-transparent">
            {platformName}
          </span>
        </h1>

        <p className="max-w-2xl text-base font-light text-white/80 md:text-lg hero-fade-in-up hero-delay-100">
          <Typewriter text={tagline} stepMs={32} startDelayMs={350} />
        </p>
        <p className="max-w-2xl text-sm text-white/60 hero-fade-in-up hero-delay-200">
          {welcomeMessage}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 hero-fade-in-up hero-delay-300">
          <Link
            href="/map"
            className="cta-shimmer group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-[#0D1117] transition-all hover:bg-accent-300 hover:shadow-lg hover:shadow-accent/30"
          >
            <Play size={16} strokeWidth={2} />
            进入闯关地图
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/sprint"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:border-white/40 hover:bg-white/10"
          >
            <Zap size={14} strokeWidth={1.8} />5 分钟冲刺
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4 hero-fade-in-up hero-delay-400">
          {[
            { label: '培训课程', value: stats.courses, denom: undefined },
            { label: '实训关卡', value: stats.levels, denom: undefined },
            { label: '已通关', value: stats.passed, denom: stats.levels },
            { label: '星数', value: stats.stars, denom: stats.maxStars },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <p className="text-lg font-semibold text-white md:text-xl">
                <CountUp value={s.value} denominator={s.denom} durationMs={1400} />
              </p>
              <p className="mt-0.5 text-[11px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
