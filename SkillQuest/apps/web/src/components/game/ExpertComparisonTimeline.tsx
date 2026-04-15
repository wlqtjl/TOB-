'use client';

/**
 * ExpertComparisonTimeline — 垂直双轨异动图
 * (Vertical Dual-Track Deviation Map)
 *
 * 通过垂直时间轴，对比"玩家操作路径"与"专家最优路径"，
 * 可视化呈现决策偏离点及其导致的后果。
 *
 * 布局:
 * ┌──────────────────────────────────────────┐
 * │ [Summary Header — 战果仪表盘]            │
 * ├────────────┬──────────┬──────────────────┤
 * │ Player     │ Timeline │ Expert           │
 * │ (Left)     │ (Center) │ (Right)          │
 * │            │          │                  │
 * │  ●─────────┼──────────┼───────● correct  │
 * │            │          │                  │
 * │  ●─────╮   │          │       ● expert   │
 * │        ╰───┼──branch──┼───────           │
 * └────────────┴──────────┴──────────────────┘
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { ReplayData, TimelineStep, DeviationPoint } from '@skillquest/types';
import {
  Trophy,
  Clock,
  Activity,
  Shield,
  ChevronDown,
  GitBranch,
  Award,
} from 'lucide-react';
import TimelineNode from './TimelineNode';
import SLACurve from './SLACurve';
import InsightPanel from './InsightPanel';
import { calculateDeviations, computeSLACurve } from '../../lib/replay-utils';

interface ExpertComparisonTimelineProps {
  data: ReplayData;
  onStepClick?: (snapshot: unknown) => void;
}

// ─── Summary Header ────────────────────────────────────────────────

function SummaryHeader({
  data,
  deviations,
  slaCurve,
}: {
  data: ReplayData;
  deviations: DeviationPoint[];
  slaCurve: Array<[number, number]>;
}) {
  const { summary } = data;
  const timeDiff = summary.userTime - summary.expertTime;
  const errorCount = data.playerSteps.filter((s) => s.status === 'error').length;

  // Determine grade
  let grade = 'S';
  let gradeColor = 'text-amber-600';
  if (summary.score >= 90) { grade = 'S'; gradeColor = 'text-amber-600'; }
  else if (summary.score >= 80) { grade = 'A'; gradeColor = 'text-emerald-400'; }
  else if (summary.score >= 60) { grade = 'B'; gradeColor = 'text-accent'; }
  else if (summary.score >= 40) { grade = 'C'; gradeColor = 'text-amber-400'; }
  else { grade = 'D'; gradeColor = 'text-red-600'; }

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
        {/* Left: Grade + SLA Curve */}
        <div className="flex items-center gap-4">
          {/* Grade badge */}
          <div className="relative flex-shrink-0">
            <div className={`w-16 h-16 rounded-2xl border border-base-200/60 bg-white/80 flex items-center justify-center ${gradeColor}`}>
              <span className="text-3xl font-black">{grade}</span>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-base-100 border border-base-200 flex items-center justify-center">
              <Award size={10} className="text-amber-600" />
            </div>
          </div>

          {/* SLA Curve */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-base-400 mb-1">
              SLA 曲线
            </span>
            <SLACurve points={slaCurve} width={220} height={64} />
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <StatCard
            icon={<Clock size={14} strokeWidth={1.5} />}
            label="耗时对比"
            value={`${formatMin(summary.userTime)} / ${formatMin(summary.expertTime)}`}
            sub={`+${formatMin(timeDiff)} 偏差`}
            variant={timeDiff > 300 ? 'danger' : 'neutral'}
          />
          <StatCard
            icon={<Activity size={14} strokeWidth={1.5} />}
            label="操作数"
            value={`${data.playerSteps.length} / ${data.expertSteps.length}`}
            sub={`${data.playerSteps.length - data.expertSteps.length >= 0 ? '+' : ''}${data.playerSteps.length - data.expertSteps.length} 步`}
            variant="neutral"
          />
          <StatCard
            icon={<Shield size={14} strokeWidth={1.5} />}
            label="偏离点"
            value={`${deviations.length}`}
            sub={`${errorCount} 错误`}
            variant={errorCount > 0 ? 'danger' : 'success'}
          />
          <StatCard
            icon={<Trophy size={14} strokeWidth={1.5} />}
            label="得分"
            value={`${summary.score}`}
            sub={`SLA ${summary.slaLoss}`}
            variant={summary.score >= 80 ? 'success' : summary.score >= 60 ? 'neutral' : 'danger'}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  variant: 'success' | 'danger' | 'neutral';
}) {
  const variantStyles = {
    success: 'border-emerald-500/20 bg-emerald-500/5',
    danger: 'border-red-200 bg-red-50',
    neutral: 'border-base-200 bg-white',
  };
  const valueColor = {
    success: 'text-emerald-400',
    danger: 'text-red-600',
    neutral: 'text-base-900',
  };

  return (
    <div className={`rounded-xl border p-3 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-1.5 mb-1 text-base-400">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-semibold font-mono ${valueColor[variant]}`}>
        {value}
      </div>
      <div className="text-[11px] text-base-400 mt-0.5">{sub}</div>
    </div>
  );
}

function formatMin(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  return s > 0 ? `${m}分${s}秒` : `${m}分`;
}

// ─── SVG Connector Lines ───────────────────────────────────────────

function TimelineConnectors({
  playerSteps,
  expertSteps,
  deviations,
  rowHeight,
}: {
  playerSteps: TimelineStep[];
  expertSteps: TimelineStep[];
  deviations: DeviationPoint[];
  rowHeight: number;
}) {
  const maxRows = Math.max(playerSteps.length, expertSteps.length);
  const svgHeight = maxRows * rowHeight;
  const centerX = 50; // SVG viewBox width = 100

  // Build deviation lookup
  const deviationIds = new Set(deviations.map((d) => d.playerStep.id));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 100 ${svgHeight}`}
      preserveAspectRatio="none"
    >
      {/* Center axis */}
      <line
        x1={centerX}
        y1={0}
        x2={centerX}
        y2={svgHeight}
        stroke="#30363d"
        strokeWidth="0.5"
        strokeDasharray="4 2"
      />

      {/* Connection lines */}
      {playerSteps.map((ps, i) => {
        const y = i * rowHeight + rowHeight / 2;
        const isDeviation = deviationIds.has(ps.id);
        const hasExpert = i < expertSteps.length;

        if (!hasExpert) return null;

        if (isDeviation) {
          // Deviation branch — Bezier curve from left side curving out
          const startX = 30;
          const endX = 70;
          const cp1x = 20; // control point curves outward
          const cp2x = 80;
          return (
            <g key={ps.id}>
              {/* Left deviation branch */}
              <path
                d={`M ${startX} ${y} C ${cp1x} ${y - 8}, ${cp1x} ${y + 8}, ${startX} ${y}`}
                fill="none"
                stroke={ps.status === 'error' ? '#ef4444' : '#f59e0b'}
                strokeWidth="0.8"
                strokeDasharray="3 2"
                opacity="0.6"
              />
              {/* Sync line (dimmed for deviations) */}
              <line
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke={ps.status === 'error' ? '#ef4444' : '#f59e0b'}
                strokeWidth="0.4"
                strokeDasharray="2 3"
                opacity="0.3"
              />
              {/* Left dot */}
              <circle cx={startX} cy={y} r="2.5" fill={ps.status === 'error' ? '#ef4444' : '#f59e0b'} opacity="0.8" />
              {/* Right dot */}
              <circle cx={endX} cy={y} r="2" fill="#6e7681" opacity="0.5" />
            </g>
          );
        }

        // Correct — solid sync line
        return (
          <g key={ps.id}>
            <line
              x1={30}
              y1={y}
              x2={70}
              y2={y}
              stroke="#22c55e"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <circle cx={30} cy={y} r="2" fill="#22c55e" opacity="0.6" />
            <circle cx={70} cy={y} r="2" fill="#22c55e" opacity="0.3" />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────

/** Vertical height (px) allocated per timeline row */
const ROW_HEIGHT = 140;

export default function ExpertComparisonTimeline({
  data,
  onStepClick,
}: ExpertComparisonTimelineProps) {
  const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const deviations = useMemo(
    () => calculateDeviations(data.playerSteps, data.expertSteps),
    [data],
  );

  const slaCurve = useMemo(
    () => computeSLACurve(data.playerSteps),
    [data],
  );

  const handleNodeClick = useCallback(
    (step: TimelineStep) => {
      setSelectedStep((prev) => (prev?.id === step.id ? null : step));
      onStepClick?.(step.worldStateSnapshot);
    },
    [onStepClick],
  );

  const handleRollback = useCallback(
    (snapshot: unknown) => {
      onStepClick?.(snapshot);
    },
    [onStepClick],
  );

  const maxRows = Math.max(data.playerSteps.length, data.expertSteps.length);

  // Typewriter summary at bottom
  const [summaryText, setSummaryText] = useState('');
  const summaryFull = useMemo(() => {
    const errors = data.playerSteps.filter((s) => s.status === 'error');
    if (errors.length === 0) return '本次操作表现优秀，所有步骤均与专家路径一致。继续保持！';
    return `本次排障共发现 ${errors.length} 处关键偏离。${errors.map((e) => `在 "${e.actionName}" 步骤中，${e.deviationNotice || '操作与专家路径不一致'}`).join('；')}。建议重点复习相关知识点，掌握正确的排障流程。`;
  }, [data]);

  useEffect(() => {
    let i = 0;
    setSummaryText('');
    const timer = setInterval(() => {
      i++;
      if (i <= summaryFull.length) {
        setSummaryText(summaryFull.substring(0, i));
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [summaryFull]);

  return (
    <div className="relative min-h-screen bg-surface">
      {/* Summary Header */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <SummaryHeader data={data} deviations={deviations} slaCurve={slaCurve} />
      </div>

      {/* Dual-Track Timeline */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_80px_1fr] gap-4 mb-4">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5">
              <GitBranch size={12} className="text-accent" />
              <span className="text-xs font-medium text-accent">玩家路径</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ChevronDown size={14} className="text-base-400" />
          </div>
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-lg border border-base-200 bg-white px-3 py-1.5">
              <Award size={12} className="text-base-400" />
              <span className="text-xs font-medium text-base-400">专家路径</span>
            </div>
          </div>
        </div>

        {/* Timeline body */}
        <div
          ref={timelineRef}
          className="relative grid grid-cols-[1fr_80px_1fr] gap-4"
          style={{ minHeight: maxRows * ROW_HEIGHT }}
        >
          {/* SVG Overlay for connector lines */}
          <div className="absolute inset-0 col-start-1 col-end-4 pointer-events-none">
            <TimelineConnectors
              playerSteps={data.playerSteps}
              expertSteps={data.expertSteps}
              deviations={deviations}
              rowHeight={ROW_HEIGHT}
            />
          </div>

          {/* Left column: Player steps */}
          <div className="relative z-10 flex flex-col gap-4 py-2">
            {data.playerSteps.map((step, i) => (
              <div key={step.id} className="flex items-center" style={{ minHeight: ROW_HEIGHT - 16 }}>
                <TimelineNode
                  actionName={step.actionName}
                  description={step.description}
                  status={step.status}
                  timestamp={step.timestamp}
                  impactScore={step.impactScore}
                  deviationNotice={step.deviationNotice}
                  isSelected={selectedStep?.id === step.id}
                  side="left"
                  onClick={() => handleNodeClick(step)}
                />
              </div>
            ))}
          </div>

          {/* Center column: Time labels */}
          <div className="relative z-10 flex flex-col gap-4 py-2">
            {Array.from({ length: maxRows }, (_, i) => {
              const playerTs = data.playerSteps[i]?.timestamp;
              const expertTs = data.expertSteps[i]?.timestamp;
              const ts = playerTs ?? expertTs ?? 0;
              const min = Math.floor(ts / 60);
              const sec = ts % 60;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center"
                  style={{ minHeight: ROW_HEIGHT - 16 }}
                >
                  <span className="text-[11px] font-mono text-base-400 bg-surface/80 px-2 py-0.5 rounded-md border border-base-200/40">
                    +{min}:{sec.toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right column: Expert steps */}
          <div className="relative z-10 flex flex-col gap-4 py-2">
            {data.expertSteps.map((step) => (
              <div key={step.id} className="flex items-center" style={{ minHeight: ROW_HEIGHT - 16 }}>
                <TimelineNode
                  actionName={step.actionName}
                  description={step.description}
                  status="expert-only"
                  timestamp={step.timestamp}
                  impactScore={step.impactScore}
                  deviationNotice={undefined}
                  isSelected={selectedStep?.id === step.id}
                  side="right"
                  onClick={() => handleNodeClick(step)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Incident Report Summary (Typewriter) */}
        <div className="mt-8 glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              事故复盘总结
            </span>
          </div>
          <p className="text-sm text-base-800 leading-relaxed">
            {summaryText}
            {summaryText.length < summaryFull.length && (
              <span className="animate-pulse text-accent">▌</span>
            )}
          </p>
        </div>
      </div>

      {/* Insight Panel (sidebar) */}
      <InsightPanel
        step={selectedStep}
        onClose={() => setSelectedStep(null)}
        onRollback={handleRollback}
      />
    </div>
  );
}
