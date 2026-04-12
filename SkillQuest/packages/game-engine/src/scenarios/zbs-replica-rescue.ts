/**
 * ZBS 副本一致性抢救关卡 — "多副本抢救战" 示例场景
 *
 * 场景: 三节点 ZBS 集群, 节点 A 硬件故障炸裂
 * 玩家必须通过精准的工具操作序列将系统从崩溃边缘拉回:
 *
 * 1. [感知] 5秒内用 Probe 发现数据一致性降级
 * 2. [操作] 用 Booster 给节点 B 提速, 承接故障负载
 * 3. [操作] 用 Booster 给节点 C 提速
 * 4. [逻辑] 用 Linker 重建元数据路径, 避免脑裂
 *
 * 如果操作过慢或顺序错误 → 脑裂(Split-brain)发生 → 屏幕黑屏 + 事故报告
 */

import type {
  WorldNode,
  WorldLink,
  ConsequencesConfig,
  ToolSequence,
  WorldNodeStatus,
} from '@skillquest/types';

// ─── 初始 WorldState 节点 ──────────────────────────────────────────

export const ZBS_REPLICA_NODES: WorldNode[] = [
  {
    id: 'node-a',
    label: 'ZBS 节点 A (故障)',
    category: 'storage-node',
    status: 'offline',  // 初始就已爆炸
    load: 0,
    ioLatencyMs: 999,
    dataIntegrity: 0.3,
    metrics: { replicas: 0, vms: 0, rebalanceProgress: 0 },
  },
  {
    id: 'node-b',
    label: 'ZBS 节点 B',
    category: 'storage-node',
    status: 'normal',
    load: 0.6,
    ioLatencyMs: 5,
    dataIntegrity: 1.0,
    metrics: { replicas: 2, vms: 4, rebalanceProgress: 0 },
  },
  {
    id: 'node-c',
    label: 'ZBS 节点 C',
    category: 'storage-node',
    status: 'normal',
    load: 0.5,
    ioLatencyMs: 4,
    dataIntegrity: 1.0,
    metrics: { replicas: 2, vms: 3, rebalanceProgress: 0 },
  },
  {
    id: 'meta-leader',
    label: 'Meta Leader',
    category: 'metadata-service',
    status: 'degraded',  // Leader 感知到副本降级
    load: 0.8,
    ioLatencyMs: 15,
    dataIntegrity: 0.95,
    metrics: { consensusRound: 42, pendingWrites: 128 },
  },
  {
    id: 'access-layer',
    label: 'Access Layer',
    category: 'access-service',
    status: 'normal',
    load: 0.7,
    ioLatencyMs: 3,
    dataIntegrity: 1.0,
    metrics: { activeConnections: 64, pendingIOs: 32 },
  },
];

// ─── 初始 WorldState 连接 ──────────────────────────────────────────

export const ZBS_REPLICA_LINKS: WorldLink[] = [
  {
    id: 'link-access-meta',
    fromNodeId: 'access-layer',
    toNodeId: 'meta-leader',
    status: 'connected',
    bandwidthUsage: 0.5,
    latencyMs: 2,
  },
  {
    id: 'link-meta-a',
    fromNodeId: 'meta-leader',
    toNodeId: 'node-a',
    status: 'disconnected',  // 节点 A 故障, 连接断开
    bandwidthUsage: 0,
    latencyMs: 999,
  },
  {
    id: 'link-meta-b',
    fromNodeId: 'meta-leader',
    toNodeId: 'node-b',
    status: 'connected',
    bandwidthUsage: 0.6,
    latencyMs: 3,
  },
  {
    id: 'link-meta-c',
    fromNodeId: 'meta-leader',
    toNodeId: 'node-c',
    status: 'connected',
    bandwidthUsage: 0.5,
    latencyMs: 3,
  },
  {
    id: 'link-b-c',
    fromNodeId: 'node-b',
    toNodeId: 'node-c',
    status: 'connected',
    bandwidthUsage: 0.3,
    latencyMs: 1,
  },
];

// ─── 因果律配置 (Consequences) ─────────────────────────────────────

export const ZBS_REPLICA_CONSEQUENCES: ConsequencesConfig = {
  actions: [
    {
      id: 'probe-meta',
      label: '探测 Meta Leader',
      description: '用听诊器探测 Meta Leader 的副本同步状态',
      prerequisites: [],
      effects: [],
      isOptimal: true,
      disasterProbability: 0,
    },
    {
      id: 'probe-node-b',
      label: '探测节点 B',
      description: '查看节点 B 的 IO 深度和副本健康度',
      prerequisites: [],
      effects: [],
      isOptimal: true,
      disasterProbability: 0,
    },
    {
      id: 'boost-node-b',
      label: '加压节点 B',
      description: '提升节点 B 的处理能力, 承接节点 A 的工作负载',
      prerequisites: ['probe-meta'],
      effects: [
        { targetNodeId: 'node-b', field: 'load', value: 0.85, delayMs: 0 },
        { targetNodeId: 'node-b', field: 'ioLatencyMs', value: 8, delayMs: 500 },
      ],
      isOptimal: true,
      disasterProbability: 0.05,
    },
    {
      id: 'boost-node-c',
      label: '加压节点 C',
      description: '提升节点 C 的处理能力',
      prerequisites: ['probe-meta'],
      effects: [
        { targetNodeId: 'node-c', field: 'load', value: 0.8, delayMs: 0 },
        { targetNodeId: 'node-c', field: 'ioLatencyMs', value: 7, delayMs: 500 },
      ],
      isOptimal: true,
      disasterProbability: 0.05,
    },
    {
      id: 'rebuild-meta-path',
      label: '重建元数据路径',
      description: '用 Linker 重建 Meta → B/C 的数据路径, 绕过故障节点 A',
      prerequisites: ['boost-node-b', 'boost-node-c'],
      effects: [
        { targetNodeId: 'meta-leader', field: 'status', value: 'normal' as WorldNodeStatus, delayMs: 2000 },
        { targetNodeId: 'meta-leader', field: 'load', value: 0.5, delayMs: 3000 },
      ],
      isOptimal: true,
      disasterProbability: 0.1,
    },
    {
      id: 'force-rebalance',
      label: '强制重平衡 (危险)',
      description: '不经探测直接触发重平衡 — 可能导致脑裂',
      prerequisites: [],
      effects: [
        { targetNodeId: 'node-b', field: 'load', value: 0.95, delayMs: 0 },
        { targetNodeId: 'node-c', field: 'load', value: 0.95, delayMs: 0 },
      ],
      isOptimal: false,
      disasterProbability: 0.6,
    },
  ],
  optimalPath: ['probe-meta', 'probe-node-b', 'boost-node-b', 'boost-node-c', 'rebuild-meta-path'],
  disasters: [
    {
      id: 'split-brain',
      name: '脑裂 (Split-Brain)',
      description: '节点 B 和 C 无法就数据一致性达成共识, 数据分裂为两个版本',
      type: 'split_brain',
      severity: 'catastrophic',
      affectedNodeIds: ['node-b', 'node-c'],
      damage: {
        downtimeMs: 3600000,   // 1 hour
        slaLoss: 60,
        dataLossPercent: 0.15,
        businessImpact: '多个 VM 数据不一致, 需要手动恢复, 业务中断至少1小时',
      },
    },
    {
      id: 'cascading-overload',
      name: '级联过载',
      description: '剩余节点无法承受全部负载, 依次过载',
      type: 'cascading_failure',
      severity: 'major',
      affectedNodeIds: ['node-b', 'node-c'],
      damage: {
        downtimeMs: 1800000,
        slaLoss: 40,
        dataLossPercent: 0.05,
        businessImpact: '所有 VM IO 延迟飙升, 多个业务超时',
      },
    },
  ],
  initialSlaScore: 100,
};

// ─── 工具操作序列 (硬核模式) ──────────────────────────────────────

export const ZBS_REPLICA_TOOL_SEQUENCE: ToolSequence = {
  id: 'zbs-replica-rescue',
  description: '多副本抢救战: 节点 A 炸裂后, 用工具序列阻止脑裂',
  requiredSteps: [
    {
      index: 0,
      requiredTool: 'probe',
      requiredTargetId: 'meta-leader',
      hint: '第1步: 用听诊器探测 Meta Leader, 发现副本一致性降级',
    },
    {
      index: 1,
      requiredTool: 'booster',
      requiredTargetId: 'node-b',
      hint: '第2步: 用加压泵给节点 B 提速, 承接故障负载',
    },
    {
      index: 2,
      requiredTool: 'booster',
      requiredTargetId: 'node-c',
      hint: '第3步: 用加压泵给节点 C 提速',
    },
    {
      index: 3,
      requiredTool: 'linker',
      requiredTargetId: 'meta-leader',
      hint: '第4步: 用重建器在 Canvas 上重建元数据路径, 绕过故障节点',
    },
  ],
  maxIntervalMs: 5000,  // 步骤间最多 5 秒
  timeLimitMs: 30000,   // 总共 30 秒
};
