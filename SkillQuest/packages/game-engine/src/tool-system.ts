/**
 * ToolSystem — 硬核仿真交互工具系统
 *
 * 从"8个按钮"进化为"一整套物理交互工具箱":
 * - Probe (听诊器): 探测节点性能指标, 弹出实时 I/O 曲线
 * - Cutter (手术刀): 切断连接, 模拟网络分区或孤立故障节点
 * - Booster (加压泵): 增加节点负载, 模拟业务高峰或恶意流量
 * - Linker (重建器): 重建连接, 引导元数据寻找新路径
 * - Migrator (磁力吸): 拖拽数据块从节点 A 到节点 B
 * - Freezer (冻结时钟): 暂停粒子流, 观察一致性快照
 *
 * 核心理念:
 * - 操作语义化: 不再是 clickButton, 而是物理工具交互
 * - 操作序列: 关卡要求 "先 Probe → 再 Cutter → 最后 Linker"
 * - 实时反馈: 每个工具操作都触发粒子/震动/热力变化
 */

import type {
  ToolType,
  ToolState,
  ToolAction,
  ToolActionResult,
  ToolSequence,
  ToolSequenceStep,
  SequenceValidationResult,
  ProbeData,
  WorldNode,
  WorldLink,
  WorldStateMutation,
} from '@skillquest/types';

// ─── 工具默认配置 ──────────────────────────────────────────────────

export interface ToolConfig {
  type: ToolType;
  cooldownMs: number;
  maxUsage: number; // -1 = unlimited
}

const DEFAULT_TOOL_CONFIGS: ToolConfig[] = [
  { type: 'probe',    cooldownMs: 1000,  maxUsage: -1 },
  { type: 'cutter',   cooldownMs: 3000,  maxUsage: 3  },
  { type: 'booster',  cooldownMs: 2000,  maxUsage: 5  },
  { type: 'linker',   cooldownMs: 3000,  maxUsage: 3  },
  { type: 'migrator', cooldownMs: 5000,  maxUsage: 2  },
  { type: 'freezer',  cooldownMs: 10000, maxUsage: 1  },
];

// ─── 工具状态初始化 ────────────────────────────────────────────────

export function createToolState(config: ToolConfig): ToolState {
  return {
    type: config.type,
    status: 'idle',
    cooldownRemainingMs: 0,
    cooldownTotalMs: config.cooldownMs,
    usageCount: 0,
    maxUsage: config.maxUsage,
  };
}

export function createAllToolStates(
  configs: ToolConfig[] = DEFAULT_TOOL_CONFIGS,
): ToolState[] {
  return configs.map(createToolState);
}

// ─── 工具可用性检查 (纯函数) ──────────────────────────────────────

export function canUseTool(tool: ToolState): boolean {
  if (tool.status !== 'idle') return false;
  if (tool.maxUsage !== -1 && tool.usageCount >= tool.maxUsage) return false;
  return true;
}

// ─── 工具使用 (纯函数) ────────────────────────────────────────────

/**
 * 激活工具 — 返回更新后的工具状态
 */
export function activateTool(tool: ToolState): ToolState {
  if (!canUseTool(tool)) return tool;
  return {
    ...tool,
    status: 'cooldown',
    cooldownRemainingMs: tool.cooldownTotalMs,
    usageCount: tool.usageCount + 1,
  };
}

/**
 * Tick 冷却 — 每帧调用, 减少冷却时间
 */
export function tickToolCooldown(tool: ToolState, deltaMs: number): ToolState {
  if (tool.status !== 'cooldown') return tool;
  const remaining = tool.cooldownRemainingMs - deltaMs;
  if (remaining <= 0) {
    const canStillUse = tool.maxUsage === -1 || tool.usageCount < tool.maxUsage;
    return {
      ...tool,
      status: canStillUse ? 'idle' : 'disabled',
      cooldownRemainingMs: 0,
    };
  }
  return {
    ...tool,
    cooldownRemainingMs: remaining,
  };
}

/**
 * Tick 所有工具冷却
 */
export function tickAllCooldowns(tools: ToolState[], deltaMs: number): ToolState[] {
  return tools.map(t => tickToolCooldown(t, deltaMs));
}

// ─── 工具动作执行 (纯函数, 与 WorldState 交互) ──────────────────

/**
 * 执行 Probe — 探测节点性能指标
 */
export function executeProbe(
  node: WorldNode,
  seed?: number,
): ProbeData {
  // 基于节点当前状态生成探测数据
  const baseLatency = node.ioLatencyMs;
  const loadFactor = node.load;

  // 使用确定性 PRNG 生成采样点 (如果提供 seed)
  const rng = seed !== undefined
    ? (i: number) => seededRandom(seed + i)
    : () => Math.random();

  const latencySamples: number[] = [];
  for (let i = 0; i < 10; i++) {
    const jitter = (rng(i) - 0.5) * baseLatency * 0.3;
    latencySamples.push(Math.max(0.1, baseLatency + jitter));
  }

  return {
    nodeId: node.id,
    ioDepth: Math.round(loadFactor * 128),
    latencySamples,
    iops: Math.round((1 - loadFactor * 0.3) * 50000),
    throughputMBps: Math.round((1 - loadFactor * 0.2) * 2000),
    replicaSync: {}, // 由调用方根据关卡配置填充
  };
}

/**
 * 执行 Cutter — 切断连接
 */
export function executeCutter(
  linkId: string,
): ToolActionResult {
  return {
    success: true,
    message: '连接已切断 — 网络分区生效',
    mutations: [
      {
        targetNodeId: linkId,
        field: 'status',
        value: 'partitioned',
        delayMs: 0,
      },
    ],
    visualTriggers: [
      'link.status.connected→partitioned',
      'tool.cutter.activate',
    ],
  };
}

/**
 * 执行 Booster — 对节点加压
 */
export function executeBooster(
  node: WorldNode,
): ToolActionResult {
  const newLoad = Math.min(1.0, node.load + 0.3);
  const newLatency = node.ioLatencyMs * 1.5;
  const mutations: WorldStateMutation[] = [
    { targetNodeId: node.id, field: 'load', value: newLoad, delayMs: 0 },
    { targetNodeId: node.id, field: 'ioLatencyMs', value: newLatency, delayMs: 0 },
  ];

  // 过载检测
  if (newLoad > 0.9) {
    mutations.push({
      targetNodeId: node.id,
      field: 'status',
      value: 'overloaded',
      delayMs: 500,
    });
  }

  return {
    success: true,
    message: newLoad > 0.9
      ? '⚠️ 节点过载! 粒子流暴增!'
      : '流量加压中... 粒子流加速',
    mutations,
    visualTriggers: [
      'tool.booster.activate',
      ...(newLoad > 0.9 ? ['node.status.normal→overloaded'] : []),
    ],
  };
}

/**
 * 执行 Linker — 重建连接
 */
export function executeLinker(
  fromNodeId: string,
  toNodeId: string,
): ToolActionResult {
  const linkId = `link-${fromNodeId}-${toNodeId}`;
  return {
    success: true,
    message: '路径已重建 — 数据流恢复',
    mutations: [
      {
        targetNodeId: linkId,
        field: 'status',
        value: 'connected',
        delayMs: 0,
      },
    ],
    visualTriggers: [
      'link.status.partitioned→connected',
      'tool.linker.activate',
    ],
  };
}

/**
 * 执行 Migrator — 数据块迁移
 */
export function executeMigrator(
  sourceNodeId: string,
  targetNodeId: string,
): ToolActionResult {
  return {
    success: true,
    message: '数据迁移中... 粒子流转向',
    mutations: [
      { targetNodeId: sourceNodeId, field: 'load', value: 0.3, delayMs: 0 },
      { targetNodeId: targetNodeId, field: 'load', value: 0.7, delayMs: 0 },
    ],
    visualTriggers: [
      'node.action.migrate',
      'tool.migrator.activate',
    ],
  };
}

/**
 * 执行 Freezer — 冻结所有粒子流
 */
export function executeFreezer(): ToolActionResult {
  return {
    success: true,
    message: '时间冻结 — 一致性快照捕获',
    mutations: [],
    visualTriggers: [
      'tool.freezer.activate',
    ],
  };
}

/**
 * 统一工具执行入口 — 根据工具类型分发
 */
export function executeToolAction(
  action: ToolAction,
  nodes: WorldNode[],
  _links: WorldLink[],
  seed?: number,
): ToolActionResult {
  const targetNode = nodes.find(n => n.id === action.targetId);

  switch (action.tool) {
    case 'probe': {
      if (!targetNode) {
        return { success: false, message: '目标节点不存在', mutations: [], visualTriggers: [] };
      }
      const probeData = executeProbe(targetNode, seed);
      return {
        success: true,
        message: `探测完成: IO深度=${probeData.ioDepth}, IOPS=${probeData.iops}`,
        mutations: [],
        visualTriggers: ['tool.probe.activate'],
        probeData,
      };
    }

    case 'cutter':
      return executeCutter(action.targetId);

    case 'booster': {
      if (!targetNode) {
        return { success: false, message: '目标节点不存在', mutations: [], visualTriggers: [] };
      }
      return executeBooster(targetNode);
    }

    case 'linker':
      return executeLinker(action.targetId, action.secondaryTargetId ?? '');

    case 'migrator':
      return executeMigrator(action.targetId, action.secondaryTargetId ?? '');

    case 'freezer':
      return executeFreezer();
  }
}

// ─── 操作序列验证 (纯函数) ────────────────────────────────────────

export interface SequenceTracker {
  sequence: ToolSequence;
  /** 已执行的动作 */
  executedActions: ToolAction[];
  /** 序列开始时间 */
  startTime: number;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 是否已失败 */
  failed: boolean;
  /** 失败原因 */
  failReason?: string;
}

/**
 * 创建序列追踪器
 */
export function createSequenceTracker(
  sequence: ToolSequence,
  startTime: number,
): SequenceTracker {
  return {
    sequence,
    executedActions: [],
    startTime,
    currentStepIndex: 0,
    failed: false,
  };
}

/**
 * 验证下一个工具动作是否符合序列要求
 */
export function validateSequenceAction(
  tracker: SequenceTracker,
  action: ToolAction,
): { tracker: SequenceTracker; result: SequenceValidationResult } {
  if (tracker.failed) {
    return {
      tracker,
      result: {
        completed: false,
        currentStep: tracker.currentStepIndex,
        totalSteps: tracker.sequence.requiredSteps.length,
        hasMistake: true,
        mistakeReason: tracker.failReason,
        remainingMs: 0,
      },
    };
  }

  const elapsed = action.timestamp - tracker.startTime;
  const remaining = tracker.sequence.timeLimitMs - elapsed;

  // 超时检查
  if (remaining <= 0) {
    const failedTracker = {
      ...tracker,
      failed: true,
      failReason: '操作超时 — 序列时间耗尽',
    };
    return {
      tracker: failedTracker,
      result: {
        completed: false,
        currentStep: tracker.currentStepIndex,
        totalSteps: tracker.sequence.requiredSteps.length,
        hasMistake: true,
        mistakeReason: '操作超时 — 序列时间耗尽',
        remainingMs: 0,
      },
    };
  }

  // 步骤间隔检查
  if (tracker.executedActions.length > 0) {
    const lastAction = tracker.executedActions[tracker.executedActions.length - 1];
    const interval = action.timestamp - lastAction.timestamp;
    if (interval > tracker.sequence.maxIntervalMs) {
      const failedTracker = {
        ...tracker,
        failed: true,
        failReason: `操作失误 — 步骤间隔 ${interval}ms 超过限制 ${tracker.sequence.maxIntervalMs}ms`,
      };
      return {
        tracker: failedTracker,
        result: {
          completed: false,
          currentStep: tracker.currentStepIndex,
          totalSteps: tracker.sequence.requiredSteps.length,
          hasMistake: true,
          mistakeReason: failedTracker.failReason,
          remainingMs: remaining,
        },
      };
    }
  }

  // 当前期望步骤
  const expectedStep = tracker.sequence.requiredSteps[tracker.currentStepIndex];
  if (!expectedStep) {
    // 序列已完成, 额外动作忽略
    return {
      tracker,
      result: {
        completed: true,
        currentStep: tracker.currentStepIndex,
        totalSteps: tracker.sequence.requiredSteps.length,
        hasMistake: false,
        remainingMs: remaining,
      },
    };
  }

  // 工具类型匹配
  if (action.tool !== expectedStep.requiredTool) {
    const failedTracker = {
      ...tracker,
      failed: true,
      failReason: `操作失误 — 期望使用 ${expectedStep.requiredTool}, 实际使用 ${action.tool}`,
    };
    return {
      tracker: failedTracker,
      result: {
        completed: false,
        currentStep: tracker.currentStepIndex,
        totalSteps: tracker.sequence.requiredSteps.length,
        hasMistake: true,
        mistakeReason: failedTracker.failReason,
        remainingMs: remaining,
      },
    };
  }

  // 目标匹配 (如果指定)
  if (expectedStep.requiredTargetId !== null && action.targetId !== expectedStep.requiredTargetId) {
    const failedTracker = {
      ...tracker,
      failed: true,
      failReason: `操作失误 — 目标错误, 期望 ${expectedStep.requiredTargetId}, 实际 ${action.targetId}`,
    };
    return {
      tracker: failedTracker,
      result: {
        completed: false,
        currentStep: tracker.currentStepIndex,
        totalSteps: tracker.sequence.requiredSteps.length,
        hasMistake: true,
        mistakeReason: failedTracker.failReason,
        remainingMs: remaining,
      },
    };
  }

  // 步骤通过 — 推进
  const newTracker: SequenceTracker = {
    ...tracker,
    executedActions: [...tracker.executedActions, action],
    currentStepIndex: tracker.currentStepIndex + 1,
  };

  const completed = newTracker.currentStepIndex >= tracker.sequence.requiredSteps.length;

  return {
    tracker: newTracker,
    result: {
      completed,
      currentStep: newTracker.currentStepIndex,
      totalSteps: tracker.sequence.requiredSteps.length,
      hasMistake: false,
      remainingMs: remaining,
    },
  };
}

// ─── 确定性 PRNG (复用 world-state 的 Mulberry32) ─────────────────

function seededRandom(seed: number): number {
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
