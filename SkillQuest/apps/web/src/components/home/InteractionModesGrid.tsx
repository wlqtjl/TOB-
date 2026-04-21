/**
 * InteractionModesGrid — 5 种关卡形态预览网格
 *
 * 对标 OpenMAIC 的「5 种交互 UI」展示思路，但完全基于 SkillQuest 自有的 8 种 play types
 * 提炼出 5 种最具代表性的形态。每个卡片都是独立 CSS/SVG 动画，无新依赖。
 */

'use client';

import Link from 'next/link';
import {
  Network,
  Terminal as TerminalIcon,
  GitFork,
  Server,
  Lightbulb,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface ModeCard {
  key: string;
  title: string;
  desc: string;
  tag: string;
  href: string;
  Icon: typeof Network;
  accent: string;
  preview: ReactNode;
}

// ─── Tiny inline animated previews (all pure CSS/SVG, no canvas) ────

function TopologyPreview() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="topo-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#58A6FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#58A6FF" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {[
        ['40,60', '100,30'],
        ['40,60', '100,90'],
        ['100,30', '160,60'],
        ['100,90', '160,60'],
      ].map(([from, to], i) => (
        <line
          key={i}
          x1={from.split(',')[0]}
          y1={from.split(',')[1]}
          x2={to.split(',')[0]}
          y2={to.split(',')[1]}
          stroke="url(#topo-line)"
          strokeWidth={1.2}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} r="2.5" fill="#58A6FF">
          <animateMotion
            dur={`${2 + i * 0.3}s`}
            repeatCount="indefinite"
            path={
              i % 2 === 0
                ? 'M40,60 Q70,45 100,30 Q130,45 160,60'
                : 'M40,60 Q70,75 100,90 Q130,75 160,60'
            }
          />
        </circle>
      ))}
      {[
        [40, 60],
        [100, 30],
        [100, 90],
        [160, 60],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="8" fill="rgba(88,166,255,0.15)" />
          <circle
            cx={cx}
            cy={cy}
            r="4"
            fill="#0D1117"
            stroke="#58A6FF"
            strokeWidth="1.2"
          />
        </g>
      ))}
    </svg>
  );
}

function TerminalPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-[#0B1020] p-3 font-mono text-[10px] leading-tight text-emerald-300">
      <div className="opacity-60">[HUAWEI]system-view</div>
      <div className="opacity-70">[HUAWEI]interface GE0/0/1</div>
      <div className="opacity-80">
        [GE0/0/1]ip address 192.168.1.1 24
      </div>
      <div className="opacity-90">
        [GE0/0/1]<span className="animate-pulse">_</span>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 h-[1px] bg-emerald-400/30" />
    </div>
  );
}

function ScenarioPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2">
      <div className="flex items-center gap-1.5 text-[10px] text-rose-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
        [告警] 核心交换机 CPU 98%
      </div>
      <div className="space-y-1">
        {[
          ['A', '立即重启设备', 'border-white/15'],
          ['B', '登录查看进程', 'border-emerald-400/60 bg-emerald-400/10'],
          ['C', '切换备用设备', 'border-white/15'],
        ].map(([k, t, cls]) => (
          <div
            key={k}
            className={`flex items-center gap-1.5 rounded border ${cls} px-1.5 py-0.5 text-[9px] text-white/80`}
          >
            <span className="text-[9px] font-semibold text-white/50">{k}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VMPlacementPreview() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
      {[20, 80, 140].map((x, i) => (
        <g key={i}>
          <rect
            x={x}
            y={30}
            width={40}
            height={60}
            rx={3}
            fill="rgba(88,166,255,0.06)"
            stroke="rgba(88,166,255,0.4)"
            strokeWidth={1}
          />
          {[0, 1, 2].map((j) => {
            const filled = (i + j) % 2 === 0;
            return (
              <rect
                key={j}
                x={x + 4}
                y={36 + j * 18}
                width={32}
                height={14}
                rx={1.5}
                fill={filled ? '#58A6FF' : 'transparent'}
                opacity={filled ? 0.7 : 1}
                stroke={filled ? 'none' : 'rgba(88,166,255,0.3)'}
                strokeDasharray={filled ? '0' : '2 2'}
              >
                {filled ? (
                  <animate
                    attributeName="opacity"
                    values="0.5;0.9;0.5"
                    dur={`${1.5 + i * 0.3}s`}
                    repeatCount="indefinite"
                  />
                ) : null}
              </rect>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function QuizPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2">
      <div className="text-[10px] text-white/70">
        Q：ZBS 副本数推荐配置？
      </div>
      <div className="space-y-1">
        {[
          ['A', '1 副本', false],
          ['B', '2 副本', false],
          ['C', '3 副本', true],
          ['D', '5 副本', false],
        ].map(([k, t, correct]) => (
          <div
            key={String(k)}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[9px] ${
              correct
                ? 'border border-emerald-400/70 bg-emerald-400/10 text-emerald-300'
                : 'border border-white/10 text-white/70'
            }`}
          >
            <span className="font-semibold text-white/50">{k}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MODES: ModeCard[] = [
  {
    key: 'topology',
    title: '拓扑连线',
    desc: '拖拽路由器 / 交换机 / 服务器，答对后彩色数据包沿路径流动',
    tag: '★★★★★ 最炫',
    href: '/play/topology/demo?course=smartx-halo',
    Icon: Network,
    accent: 'from-sky-500/20 to-blue-500/5',
    preview: <TopologyPreview />,
  },
  {
    key: 'terminal',
    title: 'VRP 终端',
    desc: '黑屏绿字模拟华为/锐捷 CLI，答对后命令逐字打印 + 设备变绿',
    tag: '★★★★ To-B 独有',
    href: '/play/terminal/demo?course=smartx-halo',
    Icon: TerminalIcon,
    accent: 'from-emerald-500/20 to-green-500/5',
    preview: <TerminalPreview />,
  },
  {
    key: 'scenario_decision',
    title: '情景决策',
    desc: '扮演运维工程师遇到真实告警，4 个选项每个展示不同后果',
    tag: '★★★★ 叙事最强',
    href: '/play/scenario_decision/demo?course=smartx-halo',
    Icon: GitFork,
    accent: 'from-rose-500/20 to-orange-500/5',
    preview: <ScenarioPreview />,
  },
  {
    key: 'vm_placement',
    title: '虚拟化沙盘',
    desc: 'VM 拖拽放置，资源条实时变化 + 多副本写入 + HA 迁移动画',
    tag: '★★★ SmartX ZBS',
    href: '/play/vm_placement/demo?course=smartx-halo',
    Icon: Server,
    accent: 'from-violet-500/20 to-purple-500/5',
    preview: <VMPlacementPreview />,
  },
  {
    key: 'quiz',
    title: '知识问答',
    desc: '单选 / 多选 / 连线配对，即时答题动效 + 连击奖励',
    tag: '★★ 基础',
    href: '/play/quiz/demo?course=smartx-halo',
    Icon: Lightbulb,
    accent: 'from-amber-500/20 to-yellow-500/5',
    preview: <QuizPreview />,
  },
];

export default function InteractionModesGrid() {
  return (
    <section className="w-full max-w-6xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-base-900">
            🎮 五种交互形态
          </h2>
          <p className="mt-1 text-sm text-base-600">
            每一种关卡形态都为特定产品知识点量身设计 — 点击预览即可试玩
          </p>
        </div>
        <Link
          href="/courses"
          className="hidden text-xs text-accent hover:underline sm:inline"
        >
          查看全部课程 →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => (
          <Link
            key={mode.key}
            href={mode.href}
            className="group relative overflow-hidden rounded-2xl border border-base-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <div className="relative mb-4 h-[96px] overflow-hidden rounded-lg border border-base-200 bg-[#0D1117]">
              {mode.preview}
            </div>
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <mode.Icon size={18} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-base-900 group-hover:text-accent">
                    {mode.title}
                  </h3>
                  <span className="shrink-0 text-[10px] text-base-400">
                    {mode.tag}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-base-600">
                  {mode.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
