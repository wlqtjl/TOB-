/**
 * NodeManager — 动态节点质量与状态管理
 *
 * 管理引力节点的动态行为:
 * - 质量映射: Mass ∝ capacity × bandwidth
 * - 状态切换: normal ↔ failed ↔ overloaded
 * - 故障注入: 将节点标记为故障 → mass 翻转为负值 (由 CorePhysicsEngine 处理)
 * - 容量/带宽实时调整
 *
 * 所有函数均为纯函数, 供应商无关。
 */

import type {
  GravityNode,
  GravityNodeStatus,
  Vec2,
  DataGravityState,
} from '@skillquest/types';

// ─── 质量计算 ──────────────────────────────────────────────────────

/** 基础质量乘数 */
const BASE_MASS_MULTIPLIER = 100;

/**
 * 根据节点的剩余容量和可用带宽计算有效质量
 *
 * Mass = BASE_MASS_MULTIPLIER × capacity × bandwidth
 * 这确保了高容量高带宽的节点吸引更多数据粒子
 */
export function computeNodeMass(capacity: number, bandwidth: number): number {
  return BASE_MASS_MULTIPLIER * Math.max(0, capacity) * Math.max(0, bandwidth);
}

// ─── 节点创建 ──────────────────────────────────────────────────────

/** 创建引力节点 */
export function createGravityNode(
  id: string,
  position: Vec2,
  options?: Partial<Pick<GravityNode, 'capacity' | 'bandwidth' | 'status' | 'label'>>,
): GravityNode {
  const capacity = options?.capacity ?? 1.0;
  const bandwidth = options?.bandwidth ?? 1.0;
  return {
    id,
    position,
    mass: computeNodeMass(capacity, bandwidth),
    status: options?.status ?? 'normal',
    capacity,
    bandwidth,
    label: options?.label ?? id,
  };
}

// ─── 节点状态更新 ──────────────────────────────────────────────────

/** 更新单个节点状态 */
export function updateNodeStatus(
  node: GravityNode,
  status: GravityNodeStatus,
): GravityNode {
  return {
    ...node,
    status,
    // 故障节点: mass 保持正值, 引力翻转由 CorePhysicsEngine 处理
    mass: computeNodeMass(node.capacity, node.bandwidth),
  };
}

/** 更新节点容量 */
export function updateNodeCapacity(
  node: GravityNode,
  capacity: number,
): GravityNode {
  const clamped = Math.max(0, Math.min(1, capacity));
  return {
    ...node,
    capacity: clamped,
    mass: computeNodeMass(clamped, node.bandwidth),
  };
}

/** 更新节点带宽 */
export function updateNodeBandwidth(
  node: GravityNode,
  bandwidth: number,
): GravityNode {
  const clamped = Math.max(0, Math.min(1, bandwidth));
  return {
    ...node,
    bandwidth: clamped,
    mass: computeNodeMass(node.capacity, clamped),
  };
}

/** 批量更新节点属性 */
export function updateNode(
  node: GravityNode,
  updates: Partial<Pick<GravityNode, 'status' | 'capacity' | 'bandwidth' | 'position' | 'label'>>,
): GravityNode {
  const capacity = updates.capacity !== undefined
    ? Math.max(0, Math.min(1, updates.capacity))
    : node.capacity;
  const bandwidth = updates.bandwidth !== undefined
    ? Math.max(0, Math.min(1, updates.bandwidth))
    : node.bandwidth;
  return {
    ...node,
    ...updates,
    capacity,
    bandwidth,
    mass: computeNodeMass(capacity, bandwidth),
  };
}

// ─── 节点管理: DataGravityState 级别 ──────────────────────────────

/** 在 state 中更新指定节点 */
export function updateNodeInGravityState(
  state: DataGravityState,
  nodeId: string,
  updates: Partial<Pick<GravityNode, 'status' | 'capacity' | 'bandwidth' | 'position' | 'label'>>,
): DataGravityState {
  return {
    ...state,
    nodes: state.nodes.map(n =>
      n.id === nodeId ? updateNode(n, updates) : n,
    ),
  };
}

/** 向 state 添加新节点 */
export function addNodeToGravityState(
  state: DataGravityState,
  node: GravityNode,
): DataGravityState {
  return {
    ...state,
    nodes: [...state.nodes, node],
  };
}

/** 从 state 移除节点 */
export function removeNodeFromGravityState(
  state: DataGravityState,
  nodeId: string,
): DataGravityState {
  return {
    ...state,
    nodes: state.nodes.filter(n => n.id !== nodeId),
  };
}

/** 故障注入: 将节点标记为 failed */
export function injectNodeFailure(
  state: DataGravityState,
  nodeId: string,
): DataGravityState {
  return updateNodeInGravityState(state, nodeId, { status: 'failed' });
}

/** 恢复节点: 将节点从 failed 恢复为 normal */
export function recoverNode(
  state: DataGravityState,
  nodeId: string,
): DataGravityState {
  return updateNodeInGravityState(state, nodeId, { status: 'normal' });
}
