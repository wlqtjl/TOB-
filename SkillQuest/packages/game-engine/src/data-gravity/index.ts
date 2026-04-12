/**
 * Data Gravity — "数据引力" 物理交互系统
 *
 * 将 IT 架构逻辑具象化为空间引力场交互:
 * - CorePhysicsEngine: 引力计算, 摩擦力, 碰撞检测
 * - NodeManager: 动态节点质量与状态管理
 * - GravityGunController: 鼠标交互工具箱 (4 种引力枪工具)
 * - EnergyMonitor: 带宽损耗与系统熵增监测
 *
 * 供应商无关 (Vendor-Agnostic), 所有逻辑抽象为通用"分布式节点"。
 */

// Vec2 — 高性能向量运算
export {
  vec2,
  add,
  sub,
  scale,
  length,
  lengthSq,
  normalize,
  distance,
  distanceSq,
  dot,
  cross,
  reflect,
  clampLength,
  ZERO,
} from './vec2';

// CorePhysicsEngine — 引力/碰撞/tick 循环
export {
  dopplerColor,
  computeNodeGravity,
  computeAnchorGravity,
  computeAntiAffinityForce,
  checkSegmentCollision,
  tickParticle,
  updatePhysics,
  createDataGravityState,
} from './core-physics-engine';

// NodeManager — 节点质量/状态管理
export {
  computeNodeMass,
  createGravityNode,
  updateNodeStatus,
  updateNodeCapacity,
  updateNodeBandwidth,
  updateNode,
  updateNodeInGravityState,
  addNodeToGravityState,
  removeNodeFromGravityState,
  injectNodeFailure,
  recoverNode,
} from './node-manager';

// GravityGunController — 引力枪交互工具
export {
  resetIdCounter,
  createGravityAnchor,
  placeGravityAnchor,
  createForceShield,
  placeForceShield,
  activateLens,
  updateLensPosition,
  deactivateLens,
  getParticlesInLens,
  applySingularity,
  executeGravityGunAction,
} from './gravity-gun-controller';
export type { GravityGunAction } from './gravity-gun-controller';

// EnergyMonitor — 带宽损耗与熵增监测
export {
  computeKineticEnergy,
  computePotentialEnergy,
  computeTotalDisplacement,
  computeEntropyDelta,
  computeEnergyMetrics,
  createEntropyHistory,
  recordEntropy,
  averageEntropy,
  peakEntropy,
} from './energy-monitor';
export type { EntropyHistory } from './energy-monitor';
