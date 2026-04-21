/**
 * InteractionTabs — 按交互形态过滤课程的 tab 组件
 *
 * 基于 SkillQuest 8 种 play types 聚合为 6 个大类标签：
 *   全部 / 拓扑连线 / 终端命令 / 情景决策 / 虚拟化沙盘 / 知识问答
 *
 * Play-type → 大类映射：
 *   topology                        → topology
 *   terminal                        → terminal
 *   scenario, scenario_decision     → scenario
 *   vm_placement                    → vm
 *   quiz, matching, ordering        → quiz
 */

'use client';

import {
  Layers,
  Network,
  Terminal as TerminalIcon,
  GitFork,
  Server,
  Lightbulb,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type InteractionCategory =
  | 'all'
  | 'topology'
  | 'terminal'
  | 'scenario'
  | 'vm'
  | 'quiz';

interface TabDef {
  key: InteractionCategory;
  label: string;
  desc: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** play types (node.type values) that belong to this category. */
  types: readonly string[];
}

export const INTERACTION_TABS: readonly TabDef[] = [
  { key: 'all', label: '全部', desc: '所有交互形态', Icon: Layers, types: [] },
  {
    key: 'topology',
    label: '拓扑连线',
    desc: '网络拓扑 · 数据包流',
    Icon: Network,
    types: ['topology'],
  },
  {
    key: 'terminal',
    label: '终端命令',
    desc: 'VRP / CLI 模拟',
    Icon: TerminalIcon,
    types: ['terminal'],
  },
  {
    key: 'scenario',
    label: '情景决策',
    desc: '故障排查 · 角色扮演',
    Icon: GitFork,
    types: ['scenario', 'scenario_decision'],
  },
  {
    key: 'vm',
    label: '虚拟化沙盘',
    desc: 'VM 放置 · 资源调度',
    Icon: Server,
    types: ['vm_placement'],
  },
  {
    key: 'quiz',
    label: '知识问答',
    desc: '单选 · 排序 · 连线',
    Icon: Lightbulb,
    types: ['quiz', 'matching', 'ordering'],
  },
] as const;

/**
 * Decide whether a course (given its interaction types) matches a category.
 */
export function courseMatchesCategory(
  interactionTypes: readonly string[],
  category: InteractionCategory,
): boolean {
  if (category === 'all') return true;
  const tab = INTERACTION_TABS.find((t) => t.key === category);
  if (!tab) return true;
  return interactionTypes.some((t) => tab.types.includes(t));
}

interface InteractionTabsProps {
  value: InteractionCategory;
  onChange: (key: InteractionCategory) => void;
  /** Optional counts per category to render a small badge next to the label. */
  counts?: Partial<Record<InteractionCategory, number>>;
}

export default function InteractionTabs({
  value,
  onChange,
  counts,
}: InteractionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="按交互形态过滤"
      className="flex flex-wrap items-center gap-2"
    >
      {INTERACTION_TABS.map((tab) => {
        const active = tab.key === value;
        const count = counts?.[tab.key];
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            title={tab.desc}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
              active
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-base-200 bg-white text-base-600 hover:border-accent/30 hover:text-base-900'
            }`}
          >
            <tab.Icon size={14} strokeWidth={1.5} />
            <span>{tab.label}</span>
            {typeof count === 'number' && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  active ? 'bg-accent/20 text-accent' : 'bg-base-100 text-base-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
