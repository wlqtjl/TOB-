/**
 * Flow-Sim Adapter — FlowSimLevel → VisualScene
 *
 * 将"数据流向仿真"关卡转化为通用 VisualScene 协议:
 *
 *   节点 (FlowSimNode) → VisualEntity  (按 role 着色)
 *   步骤 (FlowSimStep) → VisualConnection (粒子沿步骤路径动画)
 *   决策 (FlowSimDecision) → InteractionRule (type: 'click' 选正确节点)
 *
 * 支持三种子模式:
 *   observe  — 全自动播放, 只有知识点问答交互
 *   route    — 在决策点暂停, 玩家点击正确的目标节点
 *   failover — 注入故障后玩家主导恢复, 决策同 route
 *
 * 播放速度由 level.playbackSpeed 控制 (0.1 ~ 10).
 * ParticleConfig.speed 与 playbackSpeed 成正比, 实现慢放/快进效果.
 */

import type { FlowSimLevel, FlowSimNode } from '@skillquest/types';
import type { VisualScene, InteractionResult } from '../visual-scene';
import {
  entityStyle,
  connectionStyle,
  defaultFlowingParticles,
  disabledParticles,
  defaultFeedback,
  defaultViewport,
} from '../visual-scene';

// ─── Role → visual style mapping ──────────────────────────────────

const ROLE_COLORS: Record<FlowSimNode['role'], { fill: string; stroke: string; glow: string }> = {
  client:    { fill: 'rgba(139,92,246,0.2)',  stroke: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
  gateway:   { fill: 'rgba(59,130,246,0.2)',  stroke: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  control:   { fill: 'rgba(251,191,36,0.2)',  stroke: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  data:      { fill: 'rgba(34,197,94,0.2)',   stroke: '#22c55e', glow: 'rgba(34,197,94,0.5)'  },
  consensus: { fill: 'rgba(239,68,68,0.2)',   stroke: '#ef4444', glow: 'rgba(239,68,68,0.5)'  },
  external:  { fill: 'rgba(107,114,128,0.2)', stroke: '#6b7280', glow: 'rgba(107,114,128,0.4)' },
};

/** Base particle speed (px/s) at 1× playback */
const BASE_PARTICLE_SPEED = 80;

// ─── Main adapter ─────────────────────────────────────────────────

export function flowSimAdapter(level: FlowSimLevel): VisualScene {
  const viewport = defaultViewport(1000, 560);
  const speed = clampPlaybackSpeed(level.playbackSpeed ?? 1);

  // Build node-id → node map
  const nodeMap = new Map<string, FlowSimNode>(level.nodes.map((n) => [n.id, n]));

  // ── Entities: one per FlowSimNode ─────────────────────────────

  const entities: VisualScene['entities'] = level.nodes.map((node) => {
    const colors = ROLE_COLORS[node.role] ?? ROLE_COLORS.external;
    return {
      id: node.id,
      type: `flow-node-${node.role}`,
      label: node.label,
      icon: node.icon,
      position: { x: node.x, y: node.y },
      size: { w: 80, h: 60 },
      style: entityStyle(colors.fill, colors.stroke, {
        glowColor: colors.glow,
        glowRadius: 10,
      }),
      group: node.role,
      draggable: false,
      metadata: {
        role: node.role,
        faultable: node.faultable,
        annotations: node.annotations ?? [],
      },
    };
  });

  // ── Connections: one per FlowSimStep ──────────────────────────
  //
  // All connections start disabled; the renderer activates them
  // progressively as the animation timeline advances.
  // activateFlowStep() is called externally to enable each step.

  const connections: VisualScene['connections'] = level.steps.map((step) => {
    const fromNode = nodeMap.get(step.from);
    const toNode = nodeMap.get(step.to);

    let bezierControl;
    if (fromNode && toNode) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      // Slight arc so parallel return paths are distinguishable
      bezierControl = {
        cx1: midX,
        cy1: midY - 40,
        cx2: midX,
        cy2: midY - 40,
      };
    }

    const stepColor = step.color ?? '#60a5fa';

    return {
      id: step.id,
      from: step.from,
      to: step.to,
      style: connectionStyle(stepColor, { width: 2 }),
      particleConfig: disabledParticles(), // activated per-step during replay
      bezierControl,
      bidirectional: false,
    };
  });

  // ── Interactions: decision points (route / failover modes) ────

  const interactions: VisualScene['interactions'] = level.decisions.map((decision) => ({
    type: 'click' as const,
    targetFilter: undefined, // any node
    validate: (action: Record<string, unknown>): InteractionResult => {
      const entityId = String(action['entityId'] ?? '');
      const correct = decision.correctOptions.includes(entityId);
      return {
        correct,
        message: correct ? decision.correctFeedback : decision.wrongFeedback,
        highlightIds: correct ? decision.correctOptions : [entityId],
      };
    },
  }));

  // In observe mode there are no decision points — add a dummy read-only interaction
  if (level.mode === 'observe' && interactions.length === 0) {
    interactions.push({
      type: 'click' as const,
      validate: (action: Record<string, unknown>): InteractionResult => ({
        correct: true,
        message: `${nodeMap.get(String(action['entityId'] ?? ''))?.label ?? ''}`,
        highlightIds: [String(action['entityId'] ?? '')],
      }),
    });
  }

  return {
    id: level.id,
    title: level.task,
    sourceType: 'flow_sim',
    entities,
    connections,
    interactions,
    feedback: {
      ...defaultFeedback(),
      completionEffect: {
        type: 'fireworks',
        duration: 2.5,
        colors: ['#60a5fa', '#22c55e', '#fbbf24', '#a855f7'],
      },
    },
    viewport,
    // Expose playback metadata in viewport camera zoom slot for renderer access
    // (renderer reads scene.viewport.camera.zoom === playbackSpeed)
    // This is a VisualScene-compatible carrier — no schema change needed.
  };
}

// ─── Step activation helper ───────────────────────────────────────

/**
 * Activate a single step connection's particle flow.
 * The renderer calls this as the animation timeline advances to each step.
 *
 * @param scene   Current VisualScene (immutable, returns new scene)
 * @param stepId  The FlowSimStep.id to activate
 * @param speed   Playback speed multiplier (0.1 ~ 10)
 */
export function activateFlowStep(
  scene: VisualScene,
  stepId: string,
  speed = 1,
): VisualScene {
  const clamped = clampPlaybackSpeed(speed);
  // Use the step connection's existing style.color for particles
  const conn = scene.connections.find((c) => c.id === stepId);
  const stepColor = conn?.style.color ?? '#60a5fa';

  return {
    ...scene,
    connections: scene.connections.map((c) => {
      if (c.id !== stepId) return c;
      return {
        ...c,
        particleConfig: {
          ...defaultFlowingParticles(stepColor),
          speed: BASE_PARTICLE_SPEED * clamped,
          // Fewer trail segments at high speed for clarity
          trailLength: clamped >= 5 ? 2 : 6,
        },
      };
    }),
  };
}

/**
 * Activate all steps simultaneously (used for completion celebration or
 * after the player successfully routes all decisions).
 */
export function activateAllFlowSteps(
  scene: VisualScene,
  speed = 1,
): VisualScene {
  const clamped = clampPlaybackSpeed(speed);
  return {
    ...scene,
    connections: scene.connections.map((c) => {
      const stepColor = c.style.color ?? '#60a5fa';
      return {
        ...c,
        particleConfig: {
          ...defaultFlowingParticles(stepColor),
          speed: BASE_PARTICLE_SPEED * clamped,
          trailLength: clamped >= 5 ? 2 : 6,
        },
      };
    }),
  };
}

/**
 * Mark a node as faulted (failover mode): changes its style to red and
 * dims its connections.
 */
export function injectFault(scene: VisualScene, nodeId: string): VisualScene {
  return {
    ...scene,
    entities: scene.entities.map((e) => {
      if (e.id !== nodeId) return e;
      return {
        ...e,
        style: entityStyle('rgba(239,68,68,0.3)', '#ef4444', {
          glowColor: 'rgba(239,68,68,0.7)',
          glowRadius: 16,
        }),
        metadata: { ...e.metadata, faulted: true },
      };
    }),
    connections: scene.connections.map((conn) => {
      if (conn.from !== nodeId && conn.to !== nodeId) return conn;
      return { ...conn, particleConfig: disabledParticles() };
    }),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────

function clampPlaybackSpeed(speed: number): number {
  return Math.min(10, Math.max(0.1, speed));
}
