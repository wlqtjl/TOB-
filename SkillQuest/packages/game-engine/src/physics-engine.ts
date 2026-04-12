/**
 * PhysicsEngine — 粒子物理仿真引擎
 *
 * 驱动 Canvas 渲染的"活的生命体"效果:
 * - 数据粒子化: 粒子从计算节点流向存储节点, 密度/速度/颜色实时变化
 * - 状态热力感: 节点呼吸闪烁、热力图梯度、压力粒子变粗变红
 * - 全局冻结: 一键暂停所有粒子流
 * - X-Ray 模式: 透视元数据同步网络
 * - 屏幕震动: Booster/灾难触发全局抖动
 *
 * 核心理念: 物理参数由 WorldState 驱动, 不依赖具体渲染实现。
 * Canvas/PixiJS/Phaser 均可消费 PhysicsState。
 */

import type {
  PhysicsState,
  ParticlePhysics,
  NodePhysics,
  PhysicsTickInput,
  WorldNode,
  WorldLink,
} from '@skillquest/types';

// ─── 默认物理常量 ──────────────────────────────────────────────────

/** 正常节点呼吸频率 (Hz) */
const BREATH_FREQ_NORMAL = 0.5;
/** 高负载节点呼吸频率 (Hz) */
const BREATH_FREQ_ALERT = 2.0;
/** 负载阈值: 超过此值进入告警呼吸模式 */
const LOAD_ALERT_THRESHOLD = 0.7;
/** 震动衰减默认速率 (每秒) */
const DEFAULT_SHAKE_DAMPING = 2.0;

/** 粒子基础密度 */
const BASE_PARTICLE_DENSITY = 5;
/** 粒子基础速度 (px/s) */
const BASE_PARTICLE_VELOCITY = 80;
/** 粒子基础大小 (px) */
const BASE_PARTICLE_SIZE = 3;

// ─── 颜色插值 ──────────────────────────────────────────────────────

/** 从负载值 (0-1) 生成颜色: 蓝 → 黄 → 红 */
export function loadToColor(load: number): string {
  const clamped = Math.max(0, Math.min(1, load));
  if (clamped < 0.5) {
    // 蓝 → 黄
    const t = clamped * 2;
    const r = Math.round(88 + t * (250 - 88));
    const g = Math.round(166 + t * (204 - 166));
    const b = Math.round(255 + t * (21 - 255));
    return `rgb(${r},${g},${b})`;
  }
  // 黄 → 红
  const t = (clamped - 0.5) * 2;
  const r = Math.round(250 + t * (239 - 250));
  const g = Math.round(204 + t * (68 - 204));
  const b = Math.round(21 + t * (68 - 21));
  return `rgb(${r},${g},${b})`;
}

/** 从热力值 (0-1) 生成热力图颜色: 深蓝 → 蓝 → 青 → 黄 → 红 */
export function heatToColor(heat: number): string {
  const clamped = Math.max(0, Math.min(1, heat));
  if (clamped < 0.25) {
    const t = clamped * 4;
    return `rgb(${Math.round(t * 59)},${Math.round(t * 130)},${Math.round(128 + t * 118)})`;
  }
  if (clamped < 0.5) {
    const t = (clamped - 0.25) * 4;
    return `rgb(${Math.round(59 - t * 59)},${Math.round(130 + t * 125)},${Math.round(246 - t * 10)})`;
  }
  if (clamped < 0.75) {
    const t = (clamped - 0.5) * 4;
    return `rgb(${Math.round(t * 250)},${Math.round(255 - t * 51)},${Math.round(236 - t * 215)})`;
  }
  const t = (clamped - 0.75) * 4;
  return `rgb(${Math.round(250 - t * 11)},${Math.round(204 - t * 136)},${Math.round(21 + t * 47)})`;
}

// ─── 初始化 ────────────────────────────────────────────────────────

/** 为单条连接创建初始粒子物理状态 */
export function createParticlePhysics(connectionId: string): ParticlePhysics {
  return {
    connectionId,
    density: BASE_PARTICLE_DENSITY,
    velocity: BASE_PARTICLE_VELOCITY,
    viscosity: 0,
    color: '#58A6FF',
    size: BASE_PARTICLE_SIZE,
    frozen: false,
  };
}

/** 为单个节点创建初始物理状态 */
export function createNodePhysics(nodeId: string): NodePhysics {
  return {
    nodeId,
    breathPhase: 0,
    breathFrequency: BREATH_FREQ_NORMAL,
    heatValue: 0,
    shakeIntensity: 0,
    shakeDamping: DEFAULT_SHAKE_DAMPING,
  };
}

/** 创建完整的物理引擎初始状态 */
export function createPhysicsState(
  connectionIds: string[],
  nodeIds: string[],
): PhysicsState {
  return {
    particles: connectionIds.map(createParticlePhysics),
    nodes: nodeIds.map(createNodePhysics),
    globalFrozen: false,
    screenShake: { intensity: 0, remainingMs: 0 },
    xrayMode: false,
  };
}

// ─── 物理 Tick 更新 (纯函数) ──────────────────────────────────────

/**
 * 更新单个节点的物理状态
 */
export function tickNodePhysics(
  nodePhysics: NodePhysics,
  worldNode: WorldNode | undefined,
  deltaMs: number,
): NodePhysics {
  const deltaSec = deltaMs / 1000;

  // 呼吸频率基于负载
  const load = worldNode?.load ?? 0;
  const targetFreq = load > LOAD_ALERT_THRESHOLD
    ? BREATH_FREQ_ALERT
    : BREATH_FREQ_NORMAL;

  // 平滑过渡频率
  const freq = nodePhysics.breathFrequency + (targetFreq - nodePhysics.breathFrequency) * Math.min(1, deltaSec * 2);

  // 更新相位
  const phase = (nodePhysics.breathPhase + freq * deltaSec * Math.PI * 2) % (Math.PI * 2);

  // 热力值 = 负载映射
  const heatValue = load;

  // 震动衰减
  const shakeIntensity = Math.max(0, nodePhysics.shakeIntensity - nodePhysics.shakeDamping * deltaSec);

  return {
    ...nodePhysics,
    breathPhase: phase,
    breathFrequency: freq,
    heatValue,
    shakeIntensity,
    shakeDamping: nodePhysics.shakeDamping,
  };
}

/**
 * 更新单条连接的粒子物理状态
 *
 * 粒子参数由关联节点的负载/延迟驱动:
 * - 高负载 → 粒子密度增加, 颜色变红
 * - 高延迟 → 粒子变粘稠 (速度降低, 大小增加)
 * - 网络降级 → 粒子稀疏
 */
export function tickParticlePhysics(
  particle: ParticlePhysics,
  fromNode: WorldNode | undefined,
  toNode: WorldNode | undefined,
  link: WorldLink | undefined,
  frozen: boolean,
): ParticlePhysics {
  if (frozen || particle.frozen) {
    return { ...particle, frozen: true };
  }

  const avgLoad = ((fromNode?.load ?? 0) + (toNode?.load ?? 0)) / 2;
  const avgLatency = ((fromNode?.ioLatencyMs ?? 0) + (toNode?.ioLatencyMs ?? 0)) / 2;
  const bandwidth = link?.bandwidthUsage ?? 0;

  // 密度: 负载越高, 粒子越多 (模拟 I/O 暴增)
  const density = Math.round(BASE_PARTICLE_DENSITY * (1 + avgLoad * 3 + bandwidth * 2));

  // 速度: 基础速度 × (1 - 延迟影响) × 带宽系数
  const latencyFactor = 1 - Math.min(0.8, avgLatency / 200);
  const velocity = Math.max(10, BASE_PARTICLE_VELOCITY * latencyFactor * (1 + bandwidth * 0.5));

  // 粘度: 延迟越高越粘稠
  const viscosity = Math.min(1, avgLatency / 150);

  // 颜色: 基于平均负载
  const color = loadToColor(avgLoad);

  // 大小: 高粘度 → 粒子变大 (模拟"黏稠"感)
  const size = BASE_PARTICLE_SIZE * (1 + viscosity * 1.5);

  return {
    ...particle,
    density,
    velocity,
    viscosity,
    color,
    size,
    frozen: false,
  };
}

/**
 * PhysicsEngine 全局 Tick — 更新所有物理状态
 *
 * 这是纯函数, 不修改输入, 返回新的 PhysicsState。
 * Canvas 渲染循环每帧调用此函数。
 */
export function tickPhysics(
  state: PhysicsState,
  input: PhysicsTickInput,
): PhysicsState {
  const { deltaMs, worldNodes, worldLinks } = input;

  // 构建 Map 加速查找
  const nodeMap = new Map<string, WorldNode>();
  for (const n of worldNodes) nodeMap.set(n.id, n);
  const linkMap = new Map<string, WorldLink>();
  for (const l of worldLinks) linkMap.set(l.id, l);

  // 更新节点物理
  const updatedNodes = state.nodes.map((np: NodePhysics) => {
    const worldNode = nodeMap.get(np.nodeId);
    return tickNodePhysics(np, worldNode, deltaMs);
  });

  // 更新粒子物理
  const updatedParticles = state.particles.map((pp: ParticlePhysics) => {
    const link = linkMap.get(pp.connectionId);
    const fromNode = link ? nodeMap.get(link.fromNodeId) : undefined;
    const toNode = link ? nodeMap.get(link.toNodeId) : undefined;
    return tickParticlePhysics(pp, fromNode, toNode, link, state.globalFrozen);
  });

  // 屏幕震动衰减
  const shakeRemaining = Math.max(0, state.screenShake.remainingMs - deltaMs);
  const shakeIntensity = shakeRemaining > 0 && state.screenShake.remainingMs > 0
    ? state.screenShake.intensity * (shakeRemaining / state.screenShake.remainingMs)
    : 0;

  return {
    ...state,
    nodes: updatedNodes,
    particles: updatedParticles,
    screenShake: {
      intensity: shakeIntensity,
      remainingMs: shakeRemaining,
    },
  };
}

// ─── 物理效果触发 (工具 → 物理) ──────────────────────────────────

/** 触发全局冻结/解冻 */
export function toggleFreeze(state: PhysicsState): PhysicsState {
  const frozen = !state.globalFrozen;
  return {
    ...state,
    globalFrozen: frozen,
    particles: state.particles.map((p: ParticlePhysics) => ({ ...p, frozen })),
  };
}

/** 触发屏幕震动 (如 Booster 加压、灾难爆炸) */
export function triggerScreenShake(
  state: PhysicsState,
  intensity: number,
  durationMs: number,
): PhysicsState {
  return {
    ...state,
    screenShake: { intensity, remainingMs: durationMs },
  };
}

/** 触发节点震动 (如故障爆炸) */
export function triggerNodeShake(
  state: PhysicsState,
  nodeId: string,
  intensity: number,
): PhysicsState {
  return {
    ...state,
    nodes: state.nodes.map((n: NodePhysics) =>
      n.nodeId === nodeId
        ? { ...n, shakeIntensity: intensity, shakeDamping: DEFAULT_SHAKE_DAMPING }
        : n,
    ),
  };
}

/** 切换 X-Ray 模式 */
export function toggleXRay(state: PhysicsState): PhysicsState {
  return {
    ...state,
    xrayMode: !state.xrayMode,
  };
}
