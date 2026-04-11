/**
 * VisualScene Protocol — 通用视觉层协议
 *
 * 所有关卡类型的渲染最终归结为同一件事：
 * 在画布上放置实体 → 连接它们 → 粒子沿连接流动 → 反馈用户操作
 *
 * 这意味着 1 套渲染引擎 + N 套适配器（纯函数），
 * 新增关卡类型只需写一个适配器。
 */

// ─── Entity: 画布上的可视实体 ──────────────────────────────────────

export interface EntityStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  glowColor?: string;
  glowRadius?: number;
  opacity: number;
}

export interface VisualEntity {
  id: string;
  /** 业务类型标签 (device/concept/step/vm/option/terminal ...) */
  type: string;
  label: string;
  /** emoji or icon key */
  icon: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  style: EntityStyle;
  /** 分组标识, 用于交互规则过滤 (e.g. 'left', 'right', 'source', 'slot') */
  group?: string;
  draggable: boolean;
  /** 任意业务扩展数据, 渲染引擎不关心 */
  metadata: Record<string, unknown>;
}

// ─── Connection: 实体间的连线 ──────────────────────────────────────

export type ParticleShape = 'circle' | 'square' | 'diamond';

export interface ParticleConfig {
  enabled: boolean;
  color: string;
  speed: number;       // px per second
  size: number;        // px radius
  density: number;     // particles per connection
  trailLength: number; // how many trail segments
  shape: ParticleShape;
}

export interface ConnectionStyle {
  color: string;
  width: number;
  dashPattern?: number[];  // e.g. [8, 4] for dashed
  opacity: number;
}

export interface VisualConnection {
  id: string;
  from: string; // entity id
  to: string;   // entity id
  style: ConnectionStyle;
  particleConfig: ParticleConfig;
  /** Cubic bezier control points; if omitted, straight line */
  bezierControl?: { cx1: number; cy1: number; cx2: number; cy2: number };
  bidirectional: boolean;
  /** Whether this connection was created by user interaction */
  userCreated?: boolean;
}

// ─── Interaction Rules ─────────────────────────────────────────────

export type InteractionType = 'connect' | 'drag' | 'click' | 'sequence' | 'input';

export interface InteractionResult {
  correct: boolean;
  /** Feedback text shown to user */
  message?: string;
  /** IDs of entities/connections to highlight */
  highlightIds?: string[];
}

export interface InteractionRule {
  type: InteractionType;
  /** Only allow interaction starting from entities in this group */
  sourceFilter?: string;
  /** Only allow interaction targeting entities in this group */
  targetFilter?: string;
  /**
   * Validate a user action. The action shape varies by InteractionType:
   * - 'connect': { fromId: string, toId: string }
   * - 'drag':    { entityId: string, targetSlot: string }
   * - 'click':   { entityId: string }
   * - 'sequence': { orderedIds: string[] }
   * - 'input':   { entityId: string, value: string }
   *
   * Uses Record<string, unknown> for flexibility — each adapter provides
   * type-safe validation logic internally.
   */
  validate: (action: Record<string, unknown>) => InteractionResult;
}

// ─── Feedback Effects ──────────────────────────────────────────────

export interface ParticleBurst {
  /** Number of particles emitted */
  count: number;
  color: string;
  speed: number;
  lifetime: number; // seconds
  spread: number;   // radians, e.g. Math.PI * 2 for omnidirectional
}

export interface ShakeConfig {
  intensity: number; // px displacement
  duration: number;  // seconds
}

export interface CelebrationConfig {
  type: 'fireworks' | 'confetti' | 'ripple';
  duration: number;
  colors: string[];
}

export interface FeedbackConfig {
  correctEffect: ParticleBurst;
  wrongEffect: ShakeConfig;
  comboEffects: Record<string, ParticleBurst>; // keyed by combo tier
  completionEffect: CelebrationConfig;
}

// ─── Viewport ──────────────────────────────────────────────────────

export interface BackgroundConfig {
  color: string;
  gridColor?: string;
  gridSpacing?: number;
  gridVisible: boolean;
}

export interface ViewportConfig {
  width: number;
  height: number;
  background: BackgroundConfig;
  camera: { x: number; y: number; zoom: number };
}

// ─── Top-level Scene ───────────────────────────────────────────────

export interface VisualScene {
  /** Scene identifier (e.g. level id) */
  id: string;
  /** Human-readable scene title */
  title: string;
  /** Content type that produced this scene */
  sourceType: string;
  entities: VisualEntity[];
  connections: VisualConnection[];
  interactions: InteractionRule[];
  feedback: FeedbackConfig;
  viewport: ViewportConfig;
}

// ─── Helpers for adapter authors ───────────────────────────────────

/** Default particle config for flowing connections */
export function defaultFlowingParticles(color = '#FFD700'): ParticleConfig {
  return {
    enabled: true,
    color,
    speed: 80,
    size: 3,
    density: 5,
    trailLength: 6,
    shape: 'circle',
  };
}

/** Default particle config for pulsing (unlocked) connections */
export function defaultPulsingParticles(color = '#3996f6'): ParticleConfig {
  return {
    enabled: true,
    color,
    speed: 120,
    size: 2,
    density: 3,
    trailLength: 4,
    shape: 'circle',
  };
}

/** Disabled particles for static connections */
export function disabledParticles(): ParticleConfig {
  return {
    enabled: false,
    color: '#374151',
    speed: 0,
    size: 0,
    density: 0,
    trailLength: 0,
    shape: 'circle',
  };
}

/** Default entity style */
export function entityStyle(
  fill: string,
  stroke: string,
  opts: Partial<EntityStyle> = {},
): EntityStyle {
  return {
    fill,
    stroke,
    strokeWidth: 2,
    opacity: 1,
    ...opts,
  };
}

/** Default connection style */
export function connectionStyle(
  color: string,
  opts: Partial<ConnectionStyle> = {},
): ConnectionStyle {
  return {
    color,
    width: 2,
    opacity: 1,
    ...opts,
  };
}

/** Default feedback config */
export function defaultFeedback(): FeedbackConfig {
  return {
    correctEffect: {
      count: 30,
      color: '#22c55e',
      speed: 200,
      lifetime: 0.8,
      spread: Math.PI * 2,
    },
    wrongEffect: {
      intensity: 8,
      duration: 0.4,
    },
    comboEffects: {
      good: { count: 15, color: '#facc15', speed: 150, lifetime: 0.6, spread: Math.PI * 2 },
      great: { count: 25, color: '#f97316', speed: 200, lifetime: 0.7, spread: Math.PI * 2 },
      amazing: { count: 40, color: '#ef4444', speed: 250, lifetime: 0.8, spread: Math.PI * 2 },
      legendary: { count: 60, color: '#a855f7', speed: 300, lifetime: 1.0, spread: Math.PI * 2 },
    },
    completionEffect: {
      type: 'fireworks',
      duration: 2.0,
      colors: ['#FFD700', '#22c55e', '#3996f6', '#a855f7'],
    },
  };
}

/** Default viewport */
export function defaultViewport(
  width = 900,
  height = 500,
): ViewportConfig {
  return {
    width,
    height,
    background: {
      color: '#030712',
      gridColor: '#ffffff',
      gridSpacing: 30,
      gridVisible: true,
    },
    camera: { x: 0, y: 0, zoom: 1 },
  };
}
