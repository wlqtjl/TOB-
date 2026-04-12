/**
 * GravityGunController — 引力枪交互工具箱
 *
 * 管理 4 种物理交互工具:
 * 1. GravityAnchor (引力锚点): mousedown → 生成临时超高 mass 点
 * 2. ForceShield (能量护盾): 鼠标划线 → 生成碰撞段, 粒子反弹
 * 3. TheLens (引力透镜): 鼠标位置 → 圆形区域显示元数据
 * 4. Singularity (奇点引爆): doubleClick → 径向脉冲力
 *
 * 所有函数为纯函数, 输入旧状态 → 输出新状态。
 */

import type {
  Vec2,
  DataGravityState,
  GravityAnchor,
  CollisionSegment,
  LensState,
  DataParticle,
  GravityGunToolType,
} from '@skillquest/types';

import { sub, scale, normalize, distance, length, add } from './vec2';

// ─── 配置常量 ──────────────────────────────────────────────────────

/** 引力锚点默认超高质量 */
const ANCHOR_DEFAULT_MASS = 5000;
/** 引力锚点默认生命周期 (ms) */
const ANCHOR_DEFAULT_LIFETIME = 3000;
/** ForceShield 碰撞段默认生命周期 (ms) */
const SHIELD_DEFAULT_LIFETIME = 5000;
/** ForceShield 碰撞段默认反弹系数 */
const SHIELD_DEFAULT_RESTITUTION = 0.8;
/** 引力透镜默认半径 (px) */
const LENS_DEFAULT_RADIUS = 120;
/** Singularity 脉冲力强度 */
const SINGULARITY_DEFAULT_POWER = 50000;
/** Singularity 最大作用半径 (px) */
const SINGULARITY_MAX_RADIUS = 300;

// ─── ID 生成 ──────────────────────────────────────────────────────

let nextId = 0;
function generateId(prefix: string): string {
  return `${prefix}-${++nextId}`;
}

/** 重置 ID 计数器 (供测试使用) */
export function resetIdCounter(): void {
  nextId = 0;
}

// ─── GravityAnchor (引力锚点) ──────────────────────────────────────

/**
 * 在指定位置创建引力锚点
 *
 * 效果: 生成临时超高 mass 点, 强制改变周围粒子 velocity 向量
 */
export function createGravityAnchor(
  position: Vec2,
  options?: { mass?: number; lifetimeMs?: number },
): GravityAnchor {
  return {
    id: generateId('anchor'),
    position,
    mass: options?.mass ?? ANCHOR_DEFAULT_MASS,
    lifetimeMs: options?.lifetimeMs ?? ANCHOR_DEFAULT_LIFETIME,
  };
}

/** 在 state 中放置引力锚点 (mousedown 事件) */
export function placeGravityAnchor(
  state: DataGravityState,
  position: Vec2,
  options?: { mass?: number; lifetimeMs?: number },
): DataGravityState {
  const anchor = createGravityAnchor(position, options);
  return {
    ...state,
    anchors: [...state.anchors, anchor],
  };
}

// ─── ForceShield (能量护盾) ────────────────────────────────────────

/**
 * 创建碰撞段
 *
 * 效果: 粒子撞击后基于法线方向 bounce 反弹
 */
export function createForceShield(
  start: Vec2,
  end: Vec2,
  options?: { lifetimeMs?: number; restitution?: number },
): CollisionSegment {
  return {
    id: generateId('shield'),
    start,
    end,
    lifetimeMs: options?.lifetimeMs ?? SHIELD_DEFAULT_LIFETIME,
    restitution: options?.restitution ?? SHIELD_DEFAULT_RESTITUTION,
  };
}

/** 在 state 中创建 ForceShield (鼠标划线事件) */
export function placeForceShield(
  state: DataGravityState,
  start: Vec2,
  end: Vec2,
  options?: { lifetimeMs?: number; restitution?: number },
): DataGravityState {
  const segment = createForceShield(start, end, options);
  return {
    ...state,
    segments: [...state.segments, segment],
  };
}

// ─── TheLens (引力透镜) ────────────────────────────────────────────

/**
 * 激活引力透镜
 *
 * 效果: 以鼠标为中心的圆形区域内, 粒子显示其内部 Metadata
 */
export function activateLens(
  state: DataGravityState,
  position: Vec2,
  radius?: number,
): DataGravityState {
  return {
    ...state,
    lens: {
      active: true,
      position,
      radius: radius ?? LENS_DEFAULT_RADIUS,
    },
  };
}

/** 更新透镜位置 (鼠标移动) */
export function updateLensPosition(
  state: DataGravityState,
  position: Vec2,
): DataGravityState {
  if (!state.lens.active) return state;
  return {
    ...state,
    lens: { ...state.lens, position },
  };
}

/** 关闭引力透镜 */
export function deactivateLens(
  state: DataGravityState,
): DataGravityState {
  return {
    ...state,
    lens: { ...state.lens, active: false },
  };
}

/**
 * 获取透镜范围内的粒子及其 Metadata
 *
 * 渲染层调用此函数获取需要显示"数据视图"的粒子列表
 */
export function getParticlesInLens(
  state: DataGravityState,
): DataParticle[] {
  if (!state.lens.active) return [];

  const { position, radius } = state.lens;
  const rSq = radius * radius;

  return state.particles.filter(p => {
    const dx = p.position.x - position.x;
    const dy = p.position.y - position.y;
    return dx * dx + dy * dy <= rSq;
  });
}

// ─── Singularity (奇点引爆) ────────────────────────────────────────

/**
 * 在指定位置释放径向脉冲力 (doubleClick 事件)
 *
 * 效果: force = power / r (瞬时径向冲量)
 * 距离越近的粒子受到的冲量越大
 */
export function applySingularity(
  state: DataGravityState,
  position: Vec2,
  options?: { power?: number; maxRadius?: number },
): DataGravityState {
  const power = options?.power ?? SINGULARITY_DEFAULT_POWER;
  const maxRadius = options?.maxRadius ?? SINGULARITY_MAX_RADIUS;

  const updatedParticles = state.particles.map(p => {
    const delta = sub(p.position, position);
    const dist = length(delta);

    // 超出作用范围
    if (dist > maxRadius || dist < 1) return p;

    // force = power / r
    const impulseMag = power / dist;
    const dir = normalize(delta);
    const impulse = scale(dir, impulseMag / p.mass);

    return {
      ...p,
      velocity: add(p.velocity, impulse),
    };
  });

  return {
    ...state,
    particles: updatedParticles,
  };
}

// ─── 统一工具执行入口 ──────────────────────────────────────────────

export interface GravityGunAction {
  tool: GravityGunToolType;
  position: Vec2;
  /** ForceShield 终点 */
  endPosition?: Vec2;
  /** 可选参数 */
  options?: Record<string, number>;
}

/**
 * 统一的引力枪工具执行入口
 */
export function executeGravityGunAction(
  state: DataGravityState,
  action: GravityGunAction,
): DataGravityState {
  switch (action.tool) {
    case 'gravity_anchor':
      return placeGravityAnchor(state, action.position, {
        mass: action.options?.mass,
        lifetimeMs: action.options?.lifetimeMs,
      });

    case 'force_shield': {
      const end = action.endPosition ?? action.position;
      return placeForceShield(state, action.position, end, {
        lifetimeMs: action.options?.lifetimeMs,
        restitution: action.options?.restitution,
      });
    }

    case 'the_lens':
      return activateLens(state, action.position, action.options?.radius);

    case 'singularity':
      return applySingularity(state, action.position, {
        power: action.options?.power,
        maxRadius: action.options?.maxRadius,
      });
  }
}
