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
} from '../visual-scene';
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

// ─── 变化检测 ─────────────────────────────────────────────────────

export interface StateChange {
  type: 'node' | 'link';
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  trigger: string;
}

/**
 * 对比两个 WorldState, 提取变化列表
 */
export function detectChanges(
  prevNodes: WorldNode[],
  prevLinks: WorldLink[],
  nextNodes: WorldNode[],
  nextLinks: WorldLink[],
): StateChange[] {
  const changes: StateChange[] = [];

  // 节点变化
  for (const nextNode of nextNodes) {
    const prevNode = prevNodes.find(n => n.id === nextNode.id);
    if (!prevNode) continue;

    if (prevNode.status !== nextNode.status) {
      changes.push({
        type: 'node',
        id: nextNode.id,
        field: 'status',
        oldValue: prevNode.status,
        newValue: nextNode.status,
        trigger: `node.status.${prevNode.status}→${nextNode.status}`,
      });
    }

    if (prevNode.load !== nextNode.load) {
      const threshold = nextNode.load > 0.9 ? 'threshold_high' : nextNode.load < 0.3 ? 'threshold_low' : '';
      if (threshold) {
        changes.push({
          type: 'node',
          id: nextNode.id,
          field: 'load',
          oldValue: prevNode.load,
          newValue: nextNode.load,
          trigger: `node.load.${threshold}`,
        });
      }
    }

    if (prevNode.dataIntegrity !== nextNode.dataIntegrity && nextNode.dataIntegrity < 0.5) {
      changes.push({
        type: 'node',
        id: nextNode.id,
        field: 'dataIntegrity',
        oldValue: prevNode.dataIntegrity,
        newValue: nextNode.dataIntegrity,
        trigger: 'node.dataIntegrity.threshold_low',
      });
    }
  }

  // 链路变化
  for (const nextLink of nextLinks) {
    const prevLink = prevLinks.find(l => l.id === nextLink.id);
    if (!prevLink) continue;

    if (prevLink.status !== nextLink.status) {
      changes.push({
        type: 'link',
        id: nextLink.id,
        field: 'status',
        oldValue: prevLink.status,
        newValue: nextLink.status,
        trigger: `link.status.${prevLink.status}→${nextLink.status}`,
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
