/**
 * SkillQuest Game Engine — 核心游戏状态机 + 通用视觉协议
 *
 * 对标 Data Center 游戏的 route evaluation + packet simulation:
 * - LevelStateMachine: 关卡解锁/通关状态管理 (DAG 图遍历)
 * - ScoringEngine: XP + combo + star 三维度评分
 * - TopologyEngine: 拓扑连线验证 + 数据包路径计算 (BFS)
 * - ComboTracker: 连击追踪 + 视觉反馈
 *
 * 通用视觉层:
 * - VisualScene: 所有关卡类型的统一视觉协议
 * - Adapters: 各关卡类型 → VisualScene 的纯函数转换
 */

// Core engines
export { LevelStateMachine } from './level-state-machine';
export { ScoringEngine } from './scoring-engine';
export type { ScoringInput } from './scoring-engine';
export { TopologyEngine } from './topology-engine';
export { ComboTracker } from './combo-tracker';
export type { ComboState } from './combo-tracker';

// WorldState + Consequences (Phase 4)
export {
  updateNodeInState,
  updateLinkInState,
  addTimelineEntry,
  executeActionPure,
  calculateDamageReport,
  createWorldStateActions,
  initialWorldStateStore,
} from './world-state';
export type { WorldStateStore } from './world-state';

// Animation Catalog (Generic vendor-agnostic animations)
export {
  DEFAULT_ANIMATION_CATALOG,
  findMatchingAnimations,
  mergeAnimationCatalogs,
} from './animation-catalog';

// WorldState ↔ Canvas Visual Bridge
export {
  detectChanges,
  applyWorldStateChanges,
} from './world-state-visual-bridge';
export type { StateChange, PendingAnimation } from './world-state-visual-bridge';

// Visual scene protocol
export type {
  VisualScene,
  VisualEntity,
  VisualConnection,
  InteractionRule,
  InteractionResult,
  InteractionType,
  EntityStyle,
  ConnectionStyle,
  ParticleConfig,
  ParticleShape,
  ParticleBurst,
  ShakeConfig,
  CelebrationConfig,
  FeedbackConfig,
  BackgroundConfig,
  ViewportConfig,
} from './visual-scene';

export {
  defaultFlowingParticles,
  defaultPulsingParticles,
  disabledParticles,
  entityStyle,
  connectionStyle,
  defaultFeedback,
  defaultViewport,
} from './visual-scene';

// Adapters
export {
  topologyAdapter,
  activatePacketFlow,
  matchingAdapter,
  createConfirmedPairConnection,
  orderingAdapter,
  activateOrderFlow,
  quizAdapter,
  highlightCorrectOption,
  terminalAdapter,
  activateTerminalFlow,
  scenarioAdapter,
  highlightOptimalPath,
  vmPlacementAdapter,
  mapAdapter,
} from './adapters';
