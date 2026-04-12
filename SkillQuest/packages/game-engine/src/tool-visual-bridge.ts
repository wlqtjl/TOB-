/**
 * ToolVisualBridge — 工具动作 → 视觉效果桥接
 *
 * 将 ToolSystem 的语义化操作映射到 AnimationCatalog 的视觉效果。
 * 同时更新 PhysicsEngine 的粒子/节点物理参数。
 *
 * 设计: 完全基于纯函数, 输入旧状态 + 工具动作 → 输出新状态 + 动画队列。
 */

import type {
  ToolAction,
  ToolActionResult,
  PhysicsState,
  ParticlePhysics,
  AnimationEffect,
  AnimationEffectType,
} from '@skillquest/types';
import type {
  VisualScene,
  VisualConnection,
  ParticleConfig,
} from './visual-scene';
import {
  triggerScreenShake,
  triggerNodeShake,
  toggleFreeze,
} from './physics-engine';

// ─── 工具 → 动画效果映射 ──────────────────────────────────────────

/** 创建单个动画效果 */
function fx(
  type: AnimationEffectType,
  color: string,
  durationMs: number,
  opts: Partial<AnimationEffect> = {},
): AnimationEffect {
  return {
    type,
    color,
    durationMs,
    intensity: 0.8,
    loop: false,
    ...opts,
  };
}

/** 工具激活时的视觉效果 */
const TOOL_VISUAL_EFFECTS: Record<string, AnimationEffect[]> = {
  'tool.probe.activate': [
    fx('ripple', '#58A6FF', 800, { intensity: 0.5 }),
    fx('highlight', '#58A6FF', 1500),
  ],
  'tool.cutter.activate': [
    fx('connection_break', '#ef4444', 600, { intensity: 1.0 }),
    fx('spark', '#ef4444', 400, { particleCount: 20, intensity: 0.9 }),
  ],
  'tool.booster.activate': [
    fx('burst', '#f97316', 500, { particleCount: 35, intensity: 0.8 }),
    fx('pulse', '#f97316', 1500, { loop: true, intensity: 0.6 }),
    fx('shake', '#f97316', 300, { intensity: 0.4 }),
  ],
  'tool.linker.activate': [
    fx('merge', '#22c55e', 800),
    fx('trail', '#22c55e', 2000, { loop: true, intensity: 0.6 }),
    fx('ripple', '#22c55e', 600, { intensity: 0.5 }),
  ],
  'tool.migrator.activate': [
    fx('flow_redirect', '#8b5cf6', 3000, { loop: true, intensity: 0.7 }),
    fx('trail', '#8b5cf6', 5000, { loop: true }),
    fx('progress_bar', '#8b5cf6', 8000),
  ],
  'tool.freezer.activate': [
    fx('fade_out', '#60a5fa', 300, { intensity: 0.3 }),
  ],
};

// ─── 核心桥接函数 ──────────────────────────────────────────────────

export interface ToolVisualUpdate {
  /** 更新后的 PhysicsState */
  physicsState: PhysicsState;
  /** 需要播放的动画效果 (entityId → effects) */
  animations: Array<{
    entityId: string;
    effects: AnimationEffect[];
    startTime: number;
  }>;
  /** 更新后的 VisualScene (连线样式等) */
  sceneUpdates: Partial<VisualScene>;
}

/**
 * 将工具动作结果应用到视觉层
 *
 * @param action 用户执行的工具动作
 * @param result 工具执行结果
 * @param currentPhysics 当前物理状态
 * @param currentScene 当前视觉场景
 * @returns 视觉更新指令
 */
export function applyToolActionToVisuals(
  action: ToolAction,
  result: ToolActionResult,
  currentPhysics: PhysicsState,
  currentScene: VisualScene,
): ToolVisualUpdate {
  let physicsState = { ...currentPhysics };
  const animations: ToolVisualUpdate['animations'] = [];
  let updatedConnections = [...currentScene.connections];
  const now = Date.now();

  // 1. 收集所有视觉触发器对应的动画效果
  for (const trigger of result.visualTriggers) {
    const effects = TOOL_VISUAL_EFFECTS[trigger];
    if (effects) {
      animations.push({
        entityId: action.targetId,
        effects,
        startTime: now,
      });
    }
  }

  // 2. 根据工具类型应用特定物理效果
  switch (action.tool) {
    case 'probe':
      // Probe: 目标节点产生扫描波纹, 无物理变化
      break;

    case 'cutter':
      // Cutter: 目标连接粒子停止
      physicsState = {
        ...physicsState,
        particles: physicsState.particles.map((p: ParticlePhysics) =>
          p.connectionId === action.targetId
            ? { ...p, density: 0, velocity: 0, frozen: true }
            : p,
        ),
      };
      // 更新连线视觉: 断裂效果
      updatedConnections = updatedConnections.map(c =>
        c.id === action.targetId
          ? {
              ...c,
              style: { ...c.style, color: '#ef4444', opacity: 0.3, dashPattern: [4, 8] },
              particleConfig: { ...c.particleConfig, enabled: false },
            }
          : c,
      );
      break;

    case 'booster':
      // Booster: 屏幕轻微抖动 + 目标节点震动
      physicsState = triggerScreenShake(physicsState, 0.3, 300);
      physicsState = triggerNodeShake(physicsState, action.targetId, 0.6);
      break;

    case 'linker': {
      // Linker: 创建新连接 (或恢复旧连接)
      const targetConnId = `link-${action.targetId}-${action.secondaryTargetId}`;
      physicsState = {
        ...physicsState,
        particles: physicsState.particles.map((p: ParticlePhysics) =>
          p.connectionId === targetConnId
            ? { ...p, density: 5, velocity: 80, frozen: false, color: '#22c55e' }
            : p,
        ),
      };

      // 恢复连线视觉
      updatedConnections = updatedConnections.map(c =>
        c.id === targetConnId
          ? {
              ...c,
              style: { ...c.style, color: '#22c55e', opacity: 0.8, dashPattern: undefined },
              particleConfig: { ...c.particleConfig, enabled: true, color: '#22c55e' },
            }
          : c,
      );
      break;
    }

    case 'migrator':
      // Migrator: 屏幕轻微抖动 + 迁移进度效果
      physicsState = triggerScreenShake(physicsState, 0.2, 500);
      break;

    case 'freezer':
      // Freezer: 全局冻结
      physicsState = toggleFreeze(physicsState);
      break;
  }

  return {
    physicsState,
    animations,
    sceneUpdates: {
      connections: updatedConnections,
    },
  };
}

/**
 * 创建 Booster 加压后的连接粒子升级配置
 *
 * 当 Booster 被使用后, 目标节点关联的所有连接的粒子应该:
 * - 密度暴增 (粒子流变粗)
 * - 颜色变红/橙
 * - 速度增加
 */
export function boostConnectionParticles(
  connection: VisualConnection,
  boostLevel: number, // 0-1
): ParticleConfig {
  const base = connection.particleConfig;
  return {
    ...base,
    enabled: true,
    density: Math.round(base.density * (1 + boostLevel * 4)),
    speed: base.speed * (1 + boostLevel * 2),
    size: base.size * (1 + boostLevel * 1.5),
    color: boostLevel > 0.7 ? '#ef4444' : boostLevel > 0.4 ? '#f97316' : base.color,
  };
}
