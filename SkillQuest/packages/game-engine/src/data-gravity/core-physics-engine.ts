/**
 * CorePhysicsEngine — 数据引力 2D 物理引擎
 *
 * 实现基于 Canvas 2D 的"流体动力学运维"系统核心:
 * - 节点引力: F = G × (M_node × m_particle) / r²
 * - 故障斥力: 故障节点 mass 变为负值, 排斥粒子
 * - 副本互斥: 同一 replicaId 的粒子之间相互排斥
 * - 摩擦力: 模拟网络延迟的速度衰减
 * - 碰撞检测: ForceShield 碰撞段反弹
 * - 引力锚点: 临时超高 mass 点吸引粒子
 *
 * 所有函数均为纯函数, 不修改输入, 返回新状态。
 * 供应商无关 (Vendor-Agnostic)。
 */

import type {
  Vec2,
  GravityNode,
  DataParticle,
  CollisionSegment,
  GravityAnchor,
  DataGravityState,
} from '@skillquest/types';

import {
  add,
  sub,
  scale,
  length,
  normalize,
  distanceSq,
  dot,
  reflect,
  clampLength,
  ZERO,
} from './vec2';

// ─── 物理常量 ──────────────────────────────────────────────────────

/** 最小距离平方 (避免除以零和数值爆炸) */
const MIN_DIST_SQ = 400; // 20px 最小距离
/** 粒子最大速度 (px/s) */
const MAX_VELOCITY = 800;
/** 副本互斥力常量 */
const ANTI_AFFINITY_STRENGTH = 5000;
/** 副本互斥力最大作用距离平方 */
const ANTI_AFFINITY_MAX_DIST_SQ = 40000; // 200px

// ─── 多普勒色移 ────────────────────────────────────────────────────

/**
 * 根据粒子速度计算多普勒色移颜色
 * 高速 → 电光蓝 (#00F2FF), 低速 → 暗橙色 (#FF8C00)
 */
export function dopplerColor(speed: number, maxSpeed: number = MAX_VELOCITY): string {
  const t = Math.max(0, Math.min(1, speed / maxSpeed));
  // 从暗橙 (255, 140, 0) 到电光蓝 (0, 242, 255) 的线性插值
  const r = Math.round(255 * (1 - t));
  const g = Math.round(140 + (242 - 140) * t);
  const b = Math.round(0 + 255 * t);
  return `rgb(${r},${g},${b})`;
}

// ─── 力场计算 ──────────────────────────────────────────────────────

/**
 * 计算节点对粒子的引力向量
 *
 * F = G × (M_node × m_particle) / r²
 * 故障节点 mass 变为负值 → 斥力
 */
export function computeNodeGravity(
  node: GravityNode,
  particle: DataParticle,
  G: number,
): Vec2 {
  const delta = sub(node.position, particle.position);
  const dSq = Math.max(MIN_DIST_SQ, distanceSq(node.position, particle.position));

  // 故障节点: mass 翻转为负值 → 产生斥力
  const effectiveMass = node.status === 'failed' ? -Math.abs(node.mass) : node.mass;

  const forceMag = G * effectiveMass * particle.mass / dSq;
  const dir = normalize(delta);
  return scale(dir, forceMag);
}

/**
 * 计算锚点对粒子的引力向量 (临时超高 mass)
 */
export function computeAnchorGravity(
  anchor: GravityAnchor,
  particle: DataParticle,
  G: number,
): Vec2 {
  const delta = sub(anchor.position, particle.position);
  const dSq = Math.max(MIN_DIST_SQ, distanceSq(anchor.position, particle.position));
  const forceMag = G * anchor.mass * particle.mass / dSq;
  const dir = normalize(delta);
  return scale(dir, forceMag);
}

/**
 * 计算副本互斥力: 同一 replicaId 的粒子互相排斥
 *
 * 确保同组副本不会聚集在同一个引力中心
 */
export function computeAntiAffinityForce(
  particle: DataParticle,
  others: DataParticle[],
): Vec2 {
  let fx = 0;
  let fy = 0;

  for (const other of others) {
    if (other.id === particle.id) continue;
    if (other.replicaId !== particle.replicaId) continue;

    const dx = particle.position.x - other.position.x;
    const dy = particle.position.y - other.position.y;
    const dSq = dx * dx + dy * dy;

    if (dSq > ANTI_AFFINITY_MAX_DIST_SQ || dSq < 1) continue;

    const dist = Math.sqrt(dSq);
    const forceMag = ANTI_AFFINITY_STRENGTH / dSq;
    fx += (dx / dist) * forceMag;
    fy += (dy / dist) * forceMag;
  }

  return { x: fx, y: fy };
}

// ─── 碰撞检测: ForceShield 反弹 ────────────────────────────────────

/**
 * 检测粒子与碰撞段的碰撞, 返回反弹后的速度
 * 如果无碰撞, 返回 null
 */
export function checkSegmentCollision(
  particle: DataParticle,
  segment: CollisionSegment,
): Vec2 | null {
  const { start, end } = segment;
  const segDir = sub(end, start);
  const segLenSq = dot(segDir, segDir);
  if (segLenSq < 1) return null;

  // 投影粒子位置到线段上
  const toParticle = sub(particle.position, start);
  const t = Math.max(0, Math.min(1, dot(toParticle, segDir) / segLenSq));
  const closest = add(start, scale(segDir, t));

  const delta = sub(particle.position, closest);
  const dist = length(delta);

  // 碰撞半径 (粒子半径 ≈ 5px)
  if (dist > 5 || dist < 0.1) return null;

  // 法线 = 粒子位置 - 最近点
  const normal = normalize(delta);

  // 反弹速度
  const reflected = reflect(particle.velocity, normal);
  return scale(reflected, segment.restitution);
}

// ─── 单粒子 Tick ──────────────────────────────────────────────────

/**
 * 对单个粒子执行物理 tick
 *
 * 1. 计算所有节点的引力之和
 * 2. 计算锚点引力
 * 3. 计算副本互斥力
 * 4. 应用摩擦力
 * 5. 检测碰撞段反弹
 * 6. 更新速度和位置
 * 7. 更新拖尾和颜色
 */
export function tickParticle(
  particle: DataParticle,
  state: DataGravityState,
  deltaSec: number,
): DataParticle {
  // 1. 累加所有节点引力
  let totalForce: Vec2 = ZERO;
  for (const node of state.nodes) {
    totalForce = add(totalForce, computeNodeGravity(node, particle, state.G));
  }

  // 2. 累加锚点引力
  for (const anchor of state.anchors) {
    totalForce = add(totalForce, computeAnchorGravity(anchor, particle, state.G));
  }

  // 3. 副本互斥力
  totalForce = add(totalForce, computeAntiAffinityForce(particle, state.particles));

  // 4. 摩擦力 (速度阻尼)
  const frictionForce = scale(particle.velocity, -state.friction);
  totalForce = add(totalForce, frictionForce);

  // 5. 加速度 = F / m
  const acceleration = scale(totalForce, 1 / particle.mass);

  // 6. 积分: v += a * dt, p += v * dt
  let newVelocity = add(particle.velocity, scale(acceleration, deltaSec));
  newVelocity = clampLength(newVelocity, MAX_VELOCITY);

  // 7. 碰撞段反弹检测
  for (const seg of state.segments) {
    const bounced = checkSegmentCollision(
      { ...particle, velocity: newVelocity },
      seg,
    );
    if (bounced) {
      newVelocity = bounced;
      break; // 每帧只处理一次碰撞
    }
  }

  const newPosition = add(particle.position, scale(newVelocity, deltaSec));

  // 8. 拖尾更新
  const trail = [particle.position, ...particle.trail].slice(0, state.maxTrailLength);

  // 9. 多普勒色移
  const speed = length(newVelocity);
  const color = dopplerColor(speed);

  return {
    ...particle,
    position: newPosition,
    velocity: newVelocity,
    acceleration,
    color,
    trail,
  };
}

// ─── 全局 Tick ────────────────────────────────────────────────────

/**
 * CorePhysicsEngine.update() — 全局物理 Tick
 *
 * 更新所有粒子、衰减锚点/碰撞段生命周期、计算总位移。
 * 纯函数, 返回全新状态。
 */
export function updatePhysics(
  state: DataGravityState,
  deltaMs: number,
): DataGravityState {
  const deltaSec = deltaMs / 1000;

  // 更新所有粒子
  const updatedParticles = state.particles.map(p => tickParticle(p, state, deltaSec));

  // 计算总位移
  let totalDisplacement = 0;
  for (let i = 0; i < updatedParticles.length; i++) {
    const dx = updatedParticles[i].position.x - state.particles[i].position.x;
    const dy = updatedParticles[i].position.y - state.particles[i].position.y;
    totalDisplacement += Math.sqrt(dx * dx + dy * dy);
  }

  // 衰减锚点生命周期
  const updatedAnchors = state.anchors
    .map(a => ({ ...a, lifetimeMs: a.lifetimeMs - deltaMs }))
    .filter(a => a.lifetimeMs > 0);

  // 衰减碰撞段生命周期
  const updatedSegments = state.segments
    .map(s => ({ ...s, lifetimeMs: s.lifetimeMs - deltaMs }))
    .filter(s => s.lifetimeMs > 0);

  return {
    ...state,
    particles: updatedParticles,
    anchors: updatedAnchors,
    segments: updatedSegments,
    totalEnergyLoss: state.totalEnergyLoss + totalDisplacement * state.friction,
    lastTickDisplacement: totalDisplacement,
  };
}

// ─── 状态初始化 ────────────────────────────────────────────────────

/** 创建 DataGravity 物理世界初始状态 */
export function createDataGravityState(
  nodes: GravityNode[],
  particles: DataParticle[],
  options?: Partial<Pick<DataGravityState, 'G' | 'friction' | 'maxTrailLength'>>,
): DataGravityState {
  return {
    nodes,
    particles,
    anchors: [],
    segments: [],
    lens: { active: false, position: { x: 0, y: 0 }, radius: 100 },
    G: options?.G ?? 2000,
    friction: options?.friction ?? 0.5,
    maxTrailLength: options?.maxTrailLength ?? 10,
    totalEnergyLoss: 0,
    lastTickDisplacement: 0,
  };
}
