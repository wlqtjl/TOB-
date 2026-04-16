/**
 * Sandbox Play Page — /play/sandbox
 *
 * GPSL v1.1 交互实验室: Gemini 动力模拟实验关卡
 *
 * 布局:
 *   左侧 (40%) — 指令/任务区: 学习目标 + AI 引导文本 + 公式 + 学习检验
 *   右侧 (60%) — 交互画布区: 可视化区域 + 调参面板
 */

'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Beaker,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import type { SandboxSimConfig, SimVariable } from '@skillquest/types';
import ParameterPanel from '../../../../components/sandbox/ParameterPanel';
import SimulationCanvas from '../../../../components/sandbox/SimulationCanvas';
import FormulaDisplay from '../../../../components/sandbox/FormulaDisplay';

// ─── Demo sandbox config (硬盘故障重构模拟) ──────────────────────────

const DEMO_SIM_CONFIG: SandboxSimConfig = {
  modelType: 'physical_law',
  mathFormula: 'T_{repair} = \\frac{Data_{total}}{A \\times B}',
  variables: [
    { name: 'stripeDepth', label: '硬盘条带深度 (Stripe Depth)', min: 1, max: 64, default: 16, unit: 'KB' },
    { name: 'repairStreams', label: '并发修复流数', min: 1, max: 32, default: 4 },
    { name: 'dataTotal', label: '总数据量', min: 100, max: 10000, default: 2000, unit: 'GB' },
  ],
  visualLogic: '实时计算并渲染修复进度的波动曲线。当并发修复流数过高引起网络拥塞时，模型呈现红色告警动效。',
  learningCheck: '当并发修复流数增加到超过 24 时，网络拥塞会导致什么？修复时间为什么反而增加了？',
  alertThresholds: {
    repairStreams: { max: 24, message: '⚠️ 网络拥塞！并发修复流过多导致带宽饱和，修复效率下降' },
  },
  engineType: 'wave',
};

const DEMO_OBJECTIVE = '通过调节硬盘条带深度和并发修复流数，观察存储集群故障重构时间的变化规律。理解网络拥塞对修复效率的负面影响。';
const DEMO_GUIDANCE = '尝试增加并发修复流数来加快修复速度。注意观察：当修复流数超过网络带宽承载能力时会发生什么？';

// ─── Component ─────────────────────────────────────────────────────

function SandboxPlayContent() {
  const config = DEMO_SIM_CONFIG;
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    config.variables.forEach((v) => { initial[v.name] = v.default; });
    return initial;
  });
  const [showAnswer, setShowAnswer] = useState(false);

  const handleChange = useCallback((name: string, value: number) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleReset = useCallback(() => {
    const initial: Record<string, number> = {};
    config.variables.forEach((v) => { initial[v.name] = v.default; });
    setValues(initial);
    setShowAnswer(false);
  }, [config.variables]);

  // Compute repair time for display
  const repairTime = useMemo(() => {
    const a = values['stripeDepth'] ?? 16;
    const b = values['repairStreams'] ?? 4;
    const total = values['dataTotal'] ?? 2000;
    // Simulate congestion: effectiveness drops when streams > 24
    const effectiveB = b > 24 ? b * (24 / b) * 0.7 : b;
    return total / (a * effectiveB);
  }, [values]);

  const hasAlert = (values['repairStreams'] ?? 0) > 24;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-base-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg p-2 text-base-400 transition hover:bg-base-100 hover:text-base-900"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
            <div className="flex items-center gap-2">
              <Beaker size={18} strokeWidth={1.5} className="text-accent" />
              <h1 className="text-sm font-semibold text-base-900">交互实验室</h1>
            </div>
            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium text-accent">
              GPSL v1.1
            </span>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-base-200 px-3 py-1.5 text-xs text-base-600 transition hover:border-accent/40 hover:text-base-900"
          >
            <RotateCcw size={12} strokeWidth={1.5} />
            重置参数
          </button>
        </div>
      </header>

      {/* Main layout: Left 40% + Right 60% */}
      <main className="mx-auto flex max-w-7xl gap-6 p-6">
        {/* ── Left: 指令/任务区 (40%) ── */}
        <section className="w-2/5 space-y-5">
          {/* Learning objective */}
          <div className="rounded-xl border border-base-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-900">
              <BookOpen size={14} strokeWidth={1.5} className="text-accent" />
              学习目标
            </h2>
            <p className="text-sm leading-relaxed text-base-600">
              {DEMO_OBJECTIVE}
            </p>
          </div>

          {/* AI Guidance */}
          <div className="rounded-xl border border-accent-100 bg-accent-50/30 p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent-700">
              <Lightbulb size={14} strokeWidth={1.5} />
              AI 引导
            </h2>
            <p className="text-sm leading-relaxed text-accent-700/80">
              {DEMO_GUIDANCE}
            </p>
          </div>

          {/* Formula display */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-400">
              物理公式
            </h3>
            <FormulaDisplay
              formula={config.mathFormula}
              variables={values}
            />
          </div>

          {/* Computed result */}
          <div className={`rounded-xl border p-5 ${hasAlert ? 'border-red-200 bg-red-50/30' : 'border-base-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-600">计算修复时间</span>
              <span className={`font-mono text-lg font-bold ${hasAlert ? 'text-red-600' : 'text-accent'}`}>
                T = {repairTime.toFixed(2)} s
              </span>
            </div>
            {hasAlert && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle size={12} strokeWidth={1.5} />
                网络拥塞检测！修复效率正在下降
              </p>
            )}
          </div>

          {/* Learning check */}
          <div className="rounded-xl border border-base-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-900">
              <CheckCircle2 size={14} strokeWidth={1.5} className="text-game-correct" />
              学习检验
            </h2>
            <p className="text-sm text-base-600">{config.learningCheck}</p>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="mt-3 text-xs text-accent underline-offset-2 hover:underline"
            >
              {showAnswer ? '隐藏答案' : '查看参考答案'}
            </button>
            {showAnswer && (
              <div className="mt-2 rounded-lg bg-base-50 p-3 text-xs leading-relaxed text-base-600">
                当并发修复流超过 24 条时，存储网络带宽饱和，数据包重传增加，
                有效修复吞吐反而下降。修复时间 T 出现拐点上升。
                实际部署中需根据网络带宽合理设置并发修复流上限。
              </div>
            )}
          </div>
        </section>

        {/* ── Right: 交互画布区 (60%) ── */}
        <section className="w-3/5 space-y-5">
          {/* Simulation canvas */}
          <div className="rounded-xl border border-base-200 bg-white p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-400">
              可视化区域
            </h3>
            <SimulationCanvas
              config={config}
              values={{
                frequency: (values['repairStreams'] ?? 4) * 0.5,
                amplitude: (values['stripeDepth'] ?? 16) * 2,
                speed: Math.max(0.5, (values['dataTotal'] ?? 2000) / 1000),
              }}
              width={560}
              height={320}
            />
            <p className="mt-3 text-xs text-base-400">
              {config.visualLogic}
            </p>
          </div>

          {/* Parameter panel */}
          <div className="rounded-xl border border-base-200 bg-white p-5">
            <ParameterPanel
              variables={config.variables}
              values={values}
              onChange={handleChange}
              alertThresholds={config.alertThresholds}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SandboxPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <p className="text-sm text-base-400">加载实验室…</p>
        </div>
      }
    >
      <SandboxPlayContent />
    </Suspense>
  );
}
