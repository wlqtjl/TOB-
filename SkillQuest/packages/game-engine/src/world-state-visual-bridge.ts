/**
 * WorldState Visual Bridge — WorldState ↔ Canvas 动画桥接
 *
 * 订阅 WorldState store 的状态变化, 将变化映射到 VisualScene mutations:
 * - 节点状态变化 → EntityRenderer 样式更新 + ParticleSystem 特效
 * - 网络状态变化 → ConnectionRenderer 样式更新
 * - 灾难事件 → FeedbackEffects 全屏特效
 *
 * 使用现有的 Canvas 2D 渲染引擎, 不引入新渲染库。
 */

import type {
  WorldNode,
  WorldLink,
  WorldNodeStatus,
  NetworkStatus,
  AnimationCatalog,
  AnimationMapping,
  AnimationEffect,
} from '@skillquest/types';
import type {
  VisualScene,
  VisualEntity,
  VisualConnection,
  EntityStyle,
} from './visual-scene';
import { findMatchingAnimations } from './animation-catalog';

// ─── 状态到视觉的映射 ─────────────────────────────────────────────

/** 节点状态 → 实体样式 */
const NODE_STATUS_STYLES: Record<WorldNodeStatus, Partial<EntityStyle>> = {
  normal:      { fill: 'rgba(34,197,94,0.2)',  stroke: '#22c55e', opacity: 1.0 },
  degraded:    { fill: 'rgba(245,158,11,0.2)', stroke: '#f59e0b', opacity: 0.9 },
  offline:     { fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', opacity: 0.5 },
  rebooting:   { fill: 'rgba(245,158,11,0.1)', stroke: '#f59e0b', opacity: 0.7 },
  split_brain: { fill: 'rgba(239,68,68,0.3)',  stroke: '#ef4444', opacity: 0.8 },
  recovering:  { fill: 'rgba(59,130,246,0.2)', stroke: '#3b82f6', opacity: 0.8 },
  overloaded:  { fill: 'rgba(249,115,22,0.2)', stroke: '#f97316', opacity: 0.9 },
  maintenance: { fill: 'rgba(99,102,241,0.15)', stroke: '#6366f1', opacity: 0.6 },
};

/** 网络状态 → 连线样式 */
const LINK_STATUS_STYLES: Record<NetworkStatus, { color: string; opacity: number; dashPattern?: number[] }> = {
  connected:    { color: '#22c55e', opacity: 0.8 },
  degraded:     { color: '#f59e0b', opacity: 0.6, dashPattern: [8, 4] },
  partitioned:  { color: '#ef4444', opacity: 0.4, dashPattern: [4, 8] },
  disconnected: { color: '#374151', opacity: 0.2, dashPattern: [2, 6] },
};

// ─── 变化检测 (基于状态路径订阅) ──────────────────────────────────

export interface StateChange {
  type: 'node' | 'link';
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  trigger: string;
}

/**
 * 状态路径订阅定义
 *
 * 替代全量对比, 只监听注册的路径以提升性能。
 * 每个订阅定义一个路径 (如 'status', 'load') + 可选阈值条件,
 * detectChanges 只检查订阅路径而非遍历所有字段。
 */
export interface StatePathSubscription {
  /** 监听的字段路径 */
  field: string;
  /** 可选: 仅当新值满足条件时才报告变化 */
  condition?: (oldValue: unknown, newValue: unknown) => boolean;
  /** trigger 模板, 支持占位符 {old} 和 {new} */
  triggerTemplate: string;
}

/** 默认节点状态路径订阅 */
const DEFAULT_NODE_SUBSCRIPTIONS: StatePathSubscription[] = [
  {
    field: 'status',
    triggerTemplate: 'node.status.{old}→{new}',
  },
  {
    field: 'load',
    condition: (_old, newVal) => {
      const v = newVal as number;
      return v > 0.9 || v < 0.3;
    },
    triggerTemplate: 'node.load.threshold_{level}',
  },
  {
    field: 'dataIntegrity',
    condition: (_old, newVal) => (newVal as number) < 0.5,
    triggerTemplate: 'node.dataIntegrity.threshold_low',
  },
];

/** 默认链路状态路径订阅 */
const DEFAULT_LINK_SUBSCRIPTIONS: StatePathSubscription[] = [
  {
    field: 'status',
    triggerTemplate: 'link.status.{old}→{new}',
  },
];

/**
 * 基于状态路径订阅检测 WorldState 变化
 *
 * 优化: 不再全量遍历所有字段, 而是只检查已注册的订阅路径。
 * 支持自定义订阅以扩展监听范围。
 *
 * @param prevNodes 前一帧节点列表
 * @param prevLinks 前一帧链路列表
 * @param nextNodes 当前帧节点列表
 * @param nextLinks 当前帧链路列表
 * @param nodeSubscriptions 节点订阅路径 (默认: status/load/dataIntegrity)
 * @param linkSubscriptions 链路订阅路径 (默认: status)
 */
export function detectChanges(
  prevNodes: WorldNode[],
  prevLinks: WorldLink[],
  nextNodes: WorldNode[],
  nextLinks: WorldLink[],
  nodeSubscriptions: StatePathSubscription[] = DEFAULT_NODE_SUBSCRIPTIONS,
  linkSubscriptions: StatePathSubscription[] = DEFAULT_LINK_SUBSCRIPTIONS,
): StateChange[] {
  const changes: StateChange[] = [];

  // 建立 prev 节点的索引 Map, 避免 O(n²) 查找
  const prevNodeMap = new Map<string, WorldNode>();
  for (const node of prevNodes) {
    prevNodeMap.set(node.id, node);
  }

  // 节点变化: 只检查订阅的路径
  for (const nextNode of nextNodes) {
    const prevNode = prevNodeMap.get(nextNode.id);
    if (!prevNode) continue;

    for (const sub of nodeSubscriptions) {
      const oldVal = (prevNode as unknown as Record<string, unknown>)[sub.field];
      const newVal = (nextNode as unknown as Record<string, unknown>)[sub.field];

      if (oldVal === newVal) continue;

      // 如果有条件函数, 检查是否满足
      if (sub.condition && !sub.condition(oldVal, newVal)) continue;

      // 构造 trigger 字符串
      let trigger = sub.triggerTemplate
        .replace('{old}', String(oldVal))
        .replace('{new}', String(newVal));

      // 特殊处理 load 的 threshold 级别
      if (sub.field === 'load') {
        const level = (newVal as number) > 0.9 ? 'high' : 'low';
        trigger = trigger.replace('{level}', level);
      }

      changes.push({
        type: 'node',
        id: nextNode.id,
        field: sub.field,
        oldValue: oldVal,
        newValue: newVal,
        trigger,
      });
    }
  }

  // 建立 prev 链路的索引 Map
  const prevLinkMap = new Map<string, WorldLink>();
  for (const link of prevLinks) {
    prevLinkMap.set(link.id, link);
  }

  // 链路变化: 只检查订阅的路径
  for (const nextLink of nextLinks) {
    const prevLink = prevLinkMap.get(nextLink.id);
    if (!prevLink) continue;

    for (const sub of linkSubscriptions) {
      const oldVal = (prevLink as unknown as Record<string, unknown>)[sub.field];
      const newVal = (nextLink as unknown as Record<string, unknown>)[sub.field];

      if (oldVal === newVal) continue;
      if (sub.condition && !sub.condition(oldVal, newVal)) continue;

      const trigger = sub.triggerTemplate
        .replace('{old}', String(oldVal))
        .replace('{new}', String(newVal));

      changes.push({
        type: 'link',
        id: nextLink.id,
        field: sub.field,
        oldValue: oldVal,
        newValue: newVal,
        trigger,
      });
    }
  }

  return changes;
}

// ─── VisualScene 更新 ─────────────────────────────────────────────

export interface PendingAnimation {
  entityId: string;
  effects: AnimationEffect[];
  startTime: number;
}

/**
 * 将 WorldState 变化应用到 VisualScene
 *
 * @param scene 当前 VisualScene
 * @param changes 检测到的状态变化
 * @param catalog 动画目录
 * @returns 更新后的 scene + 待执行的动画列表
 */
export function applyWorldStateChanges(
  scene: VisualScene,
  changes: StateChange[],
  catalog: AnimationCatalog,
): { scene: VisualScene; animations: PendingAnimation[] } {
  let updatedEntities = [...scene.entities];
  let updatedConnections = [...scene.connections];
  const animations: PendingAnimation[] = [];

  for (const change of changes) {
    if (change.type === 'node') {
      // 更新实体样式
      const statusStyle = NODE_STATUS_STYLES[change.newValue as WorldNodeStatus];
      if (statusStyle) {
        updatedEntities = updatedEntities.map(e =>
          e.id === change.id
            ? { ...e, style: { ...e.style, ...statusStyle } }
            : e,
        );
      }

      // 查找匹配的动画
      const matchedAnimations = findMatchingAnimations(catalog, change.trigger);
      if (matchedAnimations.length > 0) {
        animations.push({
          entityId: change.id,
          effects: matchedAnimations[0].effects,
          startTime: Date.now(),
        });
      }
    }

    if (change.type === 'link') {
      // 更新连线样式
      const linkStyle = LINK_STATUS_STYLES[change.newValue as NetworkStatus];
      if (linkStyle) {
        updatedConnections = updatedConnections.map(c =>
          c.id === change.id
            ? {
                ...c,
                style: {
                  ...c.style,
                  color: linkStyle.color,
                  opacity: linkStyle.opacity,
                  dashPattern: linkStyle.dashPattern,
                },
              }
            : c,
        );
      }

      // 查找匹配的动画
      const matchedAnimations = findMatchingAnimations(catalog, change.trigger);
      if (matchedAnimations.length > 0) {
        animations.push({
          entityId: change.id,
          effects: matchedAnimations[0].effects,
          startTime: Date.now(),
        });
      }
    }
  }

  return {
    scene: {
      ...scene,
      entities: updatedEntities,
      connections: updatedConnections,
    },
    animations,
  };
}
