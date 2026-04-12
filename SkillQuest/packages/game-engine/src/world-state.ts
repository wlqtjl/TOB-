/**
 * WorldState Store — 全局沙盒状态管理 (Zustand)
 *
 * 设计原则: 通用化 — 不硬编码任何特定厂商产品
 * 任何 IT 基础设施（SmartX、华为、VMware、Nutanix 等）的
 * 设备/组件/网络状态都可以用 WorldNode + WorldLink 表示。
 *
 * Canvas 粒子引擎通过 subscribe() API 监听状态变化。
 */

import type {
  WorldState,
  WorldNode,
  WorldLink,
  ActionRecord,
  WorldNodeStatus,
  NetworkStatus,
  WorldStateMutation,
  ConsequencesConfig,
  DamageReport,
  DisasterEvent,
} from '@skillquest/types';

// ─── Store 类型 ────────────────────────────────────────────────────

export interface WorldStateStore {
  // ── 状态 ──
  state: WorldState;
  consequencesConfig: ConsequencesConfig | null;
  activeDisaster: DisasterEvent | null;
  isGameOver: boolean;
  executedActions: string[];

  // ── 初始化 ──
  initialize: (config: {
    nodes: WorldNode[];
    links: WorldLink[];
    slaScore: number;
    consequencesConfig?: ConsequencesConfig;
  }) => void;

  // ── 操作 ──
  executeAction: (actionId: string) => {
    success: boolean;
    message: string;
    disaster?: DisasterEvent;
  };

  updateNode: (nodeId: string, updates: Partial<WorldNode>) => void;
  updateLink: (linkId: string, updates: Partial<WorldLink>) => void;
  applyMutation: (mutation: WorldStateMutation) => void;

  // ── 查询 ──
  getNode: (nodeId: string) => WorldNode | undefined;
  getLink: (linkId: string) => WorldLink | undefined;
  getAvailableActions: () => string[];
  getDamageReport: () => DamageReport;

  // ── 重置 ──
  reset: () => void;
}

// ─── 默认状态 ──────────────────────────────────────────────────────

const DEFAULT_STATE: WorldState = {
  nodes: [],
  links: [],
  slaScore: 100,
  downtimeMs: 0,
  timeline: [],
};

// ─── 纯函数: 状态变更逻辑 (不依赖 Zustand, 便于测试) ────────────

export function updateNodeInState(
  state: WorldState,
  nodeId: string,
  updates: Partial<WorldNode>,
): WorldState {
  return {
    ...state,
    nodes: state.nodes.map(n =>
      n.id === nodeId ? { ...n, ...updates } : n,
    ),
  };
}

export function updateLinkInState(
  state: WorldState,
  linkId: string,
  updates: Partial<WorldLink>,
): WorldState {
  return {
    ...state,
    links: state.links.map(l =>
      l.id === linkId ? { ...l, ...updates } : l,
    ),
  };
}

export function addTimelineEntry(
  state: WorldState,
  actionType: string,
  targetNodeId: string | undefined,
  node: WorldNode | undefined,
  updatedNode: Partial<WorldNode>,
): WorldState {
  const entry: ActionRecord = {
    actionType,
    targetNodeId,
    timestamp: Date.now(),
    stateBefore: node ? { status: node.status, load: node.load, ioLatencyMs: node.ioLatencyMs } : {},
    stateAfter: updatedNode,
  };
  return {
    ...state,
    timeline: [...state.timeline, entry],
  };
}

/**
 * 执行操作并计算后果
 *
 * 核心因果逻辑:
 * - 检查前置条件是否满足
 * - 应用 effects (WorldStateMutation[])
 * - 检查灾难概率
 * - 更新 SLA 分数
 */
export function executeActionPure(
  state: WorldState,
  actionId: string,
  executedActions: string[],
  config: ConsequencesConfig,
): {
  newState: WorldState;
  disaster: DisasterEvent | null;
  message: string;
  success: boolean;
} {
  const action = config.actions.find(a => a.id === actionId);
  if (!action) {
    return { newState: state, disaster: null, message: `未知操作: ${actionId}`, success: false };
  }

  // 检查前置条件
  const missingPrereqs = action.prerequisites.filter(p => !executedActions.includes(p));
  if (missingPrereqs.length > 0) {
    return {
      newState: state,
      disaster: null,
      message: `需要先执行: ${missingPrereqs.join(', ')}`,
      success: false,
    };
  }

  // 应用 effects (即时效果, delayMs > 0 的效果由调用方调度)
  let newState = { ...state };
  for (const effect of action.effects) {
    if (effect.delayMs === 0) {
      newState = updateNodeInState(
        newState,
        effect.targetNodeId,
        { [effect.field]: effect.value } as Partial<WorldNode>,
      );
    }
  }

  // 灾难概率检查
  // 前置条件未充分满足时, 灾难概率更高
  const hasPreCheck = executedActions.some(a =>
    config.actions.find(ca => ca.id === a)?.isOptimal === true,
  );
  // Pre-check reduces disaster probability by 70%
  const DISASTER_PROBABILITY_REDUCTION = 0.3;
  const adjustedProb = hasPreCheck
    ? action.disasterProbability * DISASTER_PROBABILITY_REDUCTION
    : action.disasterProbability;

  let disaster: DisasterEvent | null = null;
  if (adjustedProb > 0 && Math.random() < adjustedProb) {
    disaster = config.disasters.find(d =>
      d.affectedNodeIds.some(nid =>
        action.effects.some(e => e.targetNodeId === nid),
      ),
    ) || config.disasters[0] || null;

    if (disaster) {
      // 应用灾难效果
      for (const nodeId of disaster.affectedNodeIds) {
        const disasterStatus: WorldNodeStatus = disaster.type === 'split_brain'
          ? 'split_brain'
          : 'offline';
        newState = updateNodeInState(newState, nodeId, { status: disasterStatus });
      }
      newState = {
        ...newState,
        slaScore: Math.max(0, newState.slaScore - disaster.damage.slaLoss),
        downtimeMs: newState.downtimeMs + disaster.damage.downtimeMs,
      };
    }
  }

  // 即使没有灾难, 非最优操作也扣 SLA
  if (!action.isOptimal && !disaster) {
    newState = {
      ...newState,
      slaScore: Math.max(0, newState.slaScore - 5),
    };
  }

  // 添加时间线记录
  const targetNode = state.nodes.find(n =>
    action.effects.some(e => e.targetNodeId === n.id),
  );
  newState = addTimelineEntry(
    newState,
    actionId,
    targetNode?.id,
    targetNode,
    {},
  );

  return {
    newState,
    disaster,
    message: disaster
      ? `⚠️ ${disaster.name}: ${disaster.description}`
      : action.isOptimal
        ? `✓ ${action.label}`
        : `△ ${action.label} (非最优)`,
    success: true,
  };
}

/**
 * 计算当前损害报告
 */
export function calculateDamageReport(state: WorldState): DamageReport {
  const offlineNodes = state.nodes.filter(n =>
    n.status === 'offline' || n.status === 'split_brain',
  );
  const dataLoss = state.nodes.reduce((sum, n) => sum + (1 - n.dataIntegrity), 0) / Math.max(state.nodes.length, 1);

  return {
    downtimeMs: state.downtimeMs,
    slaLoss: 100 - state.slaScore,
    dataLossPercent: Math.min(1, dataLoss),
    businessImpact: offlineNodes.length > 0
      ? `${offlineNodes.length} 个节点不可用, 影响相关业务服务`
      : '所有节点正常运行',
  };
}

// ─── 创建 Store (适配 Zustand 或纯 JS) ──────────────────────────

/**
 * createWorldStateStore — 创建 WorldState store 实例
 *
 * 使用方法:
 * 1. Zustand (React): import { create } from 'zustand'; const store = create(createWorldStateStore);
 * 2. 纯 JS (Canvas): 直接调用, 手动管理 subscribe
 *
 * 这里导出纯函数 + 初始状态, 实际 store 创建由使用方决定
 */
export function createWorldStateActions(
  getState: () => WorldStateStore,
  setState: (partial: Partial<WorldStateStore>) => void,
): Omit<WorldStateStore, 'state' | 'consequencesConfig' | 'activeDisaster' | 'isGameOver' | 'executedActions'> {
  return {
    initialize(config) {
      setState({
        state: {
          nodes: config.nodes,
          links: config.links,
          slaScore: config.slaScore,
          downtimeMs: 0,
          timeline: [],
        },
        consequencesConfig: config.consequencesConfig || null,
        activeDisaster: null,
        isGameOver: false,
        executedActions: [],
      });
    },

    executeAction(actionId) {
      const store = getState();
      if (!store.consequencesConfig || store.isGameOver) {
        return { success: false, message: '无法执行操作' };
      }

      const result = executeActionPure(
        store.state,
        actionId,
        store.executedActions,
        store.consequencesConfig,
      );

      const updates: Partial<WorldStateStore> = {
        state: result.newState,
        executedActions: [...store.executedActions, actionId],
      };

      if (result.disaster) {
        updates.activeDisaster = result.disaster;
        if (result.disaster.severity === 'catastrophic') {
          updates.isGameOver = true;
        }
      }

      setState(updates);

      return {
        success: result.success,
        message: result.message,
        disaster: result.disaster || undefined,
      };
    },

    updateNode(nodeId, updates) {
      const store = getState();
      setState({
        state: updateNodeInState(store.state, nodeId, updates),
      });
    },

    updateLink(linkId, updates) {
      const store = getState();
      setState({
        state: updateLinkInState(store.state, linkId, updates),
      });
    },

    applyMutation(mutation) {
      const store = getState();
      setState({
        state: updateNodeInState(
          store.state,
          mutation.targetNodeId,
          { [mutation.field]: mutation.value } as Partial<WorldNode>,
        ),
      });
    },

    getNode(nodeId) {
      return getState().state.nodes.find(n => n.id === nodeId);
    },

    getLink(linkId) {
      return getState().state.links.find(l => l.id === linkId);
    },

    getAvailableActions() {
      const store = getState();
      if (!store.consequencesConfig) return [];
      return store.consequencesConfig.actions
        .filter(a => a.prerequisites.every(p => store.executedActions.includes(p)))
        .map(a => a.id);
    },

    getDamageReport() {
      return calculateDamageReport(getState().state);
    },

    reset() {
      setState({
        state: { ...DEFAULT_STATE },
        consequencesConfig: null,
        activeDisaster: null,
        isGameOver: false,
        executedActions: [],
      });
    },
  };
}

// ─── 导出初始 store 状态 ──────────────────────────────────────────

export const initialWorldStateStore: Pick<
  WorldStateStore,
  'state' | 'consequencesConfig' | 'activeDisaster' | 'isGameOver' | 'executedActions'
> = {
  state: { ...DEFAULT_STATE },
  consequencesConfig: null,
  activeDisaster: null,
  isGameOver: false,
  executedActions: [],
};
