/**
 * EnergyMonitor — 带宽损耗与系统熵增监测
 *
 * 实时计算:
 * - 位移总量: 每 tick 所有粒子的位移之和 → "系统带宽能量损耗"
 * - 动能: ½mv² 总和
 * - 势能: 粒子在引力场中的势能
 * - 熵增: 操作引起的引力波动度量 (用于复盘报告曲线图)
 *
 * 纯函数, 无副作用。
 */

import type {
  DataGravityState,
  EnergyMetrics,
  DataParticle,
  GravityNode,
} from '@skillquest/types';

import { distanceSq, length } from './vec2';

// ─── 能量计算 ──────────────────────────────────────────────────────

/**
 * 计算系统总动能 (Kinetic Energy)
 *
 * KE = Σ ½ × m × v²
 */
export function computeKineticEnergy(particles: DataParticle[]): number {
  let ke = 0;
  for (const p of particles) {
    const vSq = p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y;
    ke += 0.5 * p.mass * vSq;
  }
  return ke;
}

/**
 * 计算系统总势能 (Gravitational Potential Energy)
 *
 * PE = Σ -G × M × m / r (对每个粒子-节点对)
 */
export function computePotentialEnergy(
  particles: DataParticle[],
  nodes: GravityNode[],
  G: number,
): number {
  let pe = 0;
  for (const p of particles) {
    for (const n of nodes) {
      const dSq = distanceSq(p.position, n.position);
      const r = Math.sqrt(Math.max(400, dSq)); // 最小距离 20px
      const effectiveMass = n.status === 'failed' ? -Math.abs(n.mass) : n.mass;
      pe += -G * effectiveMass * p.mass / r;
    }
  }
  return pe;
}

// ─── 位移计算 ──────────────────────────────────────────────────────

/**
 * 计算两个粒子数组之间的总位移
 */
export function computeTotalDisplacement(
  before: DataParticle[],
  after: DataParticle[],
): number {
  let total = 0;
  const count = Math.min(before.length, after.length);
  for (let i = 0; i < count; i++) {
    const dx = after[i].position.x - before[i].position.x;
    const dy = after[i].position.y - before[i].position.y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ─── 熵增计算 ──────────────────────────────────────────────────────

/**
 * 计算系统熵增 (Entropy Delta)
 *
 * 熵增 = |当前动能 - 上一帧动能| + 锚点数 × 锚点扰动因子
 *
 * 高熵增表示系统不稳定, 通常由用户频繁操作(乱点锚点)导致。
 * 用于生成复盘报告中的"系统熵增曲线图"。
 */
export function computeEntropyDelta(
  currentKE: number,
  previousKE: number,
  anchorCount: number,
): number {
  const keDelta = Math.abs(currentKE - previousKE);
  const anchorDisturbance = anchorCount * 500; // 每个锚点贡献 500 熵单位
  return keDelta + anchorDisturbance;
}

// ─── 综合能量指标 ──────────────────────────────────────────────────

/**
 * 计算完整的能量监测指标
 *
 * @param state 当前物理状态
 * @param previousKE 上一帧动能 (用于计算熵增)
 * @param deltaSec 时间步长 (秒)
 */
export function computeEnergyMetrics(
  state: DataGravityState,
  previousKE: number,
  deltaSec: number,
): EnergyMetrics {
  const kineticEnergy = computeKineticEnergy(state.particles);
  const potentialEnergy = computePotentialEnergy(state.particles, state.nodes, state.G);
  const displacement = state.lastTickDisplacement;
  const bandwidthLossRate = deltaSec > 0 ? displacement / deltaSec : 0;
  const entropyDelta = computeEntropyDelta(kineticEnergy, previousKE, state.anchors.length);

  return {
    displacement,
    kineticEnergy,
    potentialEnergy,
    bandwidthLossRate,
    entropyDelta,
  };
}

// ─── 熵增历史追踪 ──────────────────────────────────────────────────

export interface EntropyHistory {
  /** 时间戳 (ms) */
  timestamps: number[];
  /** 对应的熵增值 */
  values: number[];
  /** 最大记录条数 */
  maxLength: number;
}

/** 创建空的熵增历史 */
export function createEntropyHistory(maxLength: number = 300): EntropyHistory {
  return {
    timestamps: [],
    values: [],
    maxLength,
  };
}

/** 记录一个熵增数据点 */
export function recordEntropy(
  history: EntropyHistory,
  timestamp: number,
  entropyDelta: number,
): EntropyHistory {
  const timestamps = [...history.timestamps, timestamp];
  const values = [...history.values, entropyDelta];

  // 保持最大长度
  if (timestamps.length > history.maxLength) {
    return {
      ...history,
      timestamps: timestamps.slice(-history.maxLength),
      values: values.slice(-history.maxLength),
    };
  }

  return { ...history, timestamps, values };
}

/** 计算最近 N 帧的平均熵增 */
export function averageEntropy(history: EntropyHistory, lastN?: number): number {
  const n = lastN ?? history.values.length;
  if (n === 0 || history.values.length === 0) return 0;
  const slice = history.values.slice(-n);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/** 计算最近 N 帧的峰值熵增 */
export function peakEntropy(history: EntropyHistory, lastN?: number): number {
  const n = lastN ?? history.values.length;
  if (n === 0 || history.values.length === 0) return 0;
  const slice = history.values.slice(-n);
  return Math.max(...slice);
}
