/**
 * SkillQuest — 共享类型定义
 *
 * 对标 Data Center 游戏的核心数据模型:
 * - LevelNode   → 对标 Data Center 的 route evaluation (关卡状态机)
 * - ScoreResult  → 对标 XP + money + reputation 三维度评分
 * - TopologyQuiz → 对标 packet-balls 拓扑连线题
 * - TerminalQuiz → VRP 终端命令填空题
 * - ScenarioQuiz → 故障排查情景剧本
 */

// ─── 关卡状态机 (对标 Data Center route evaluation) ─────────────────

export type LevelType =
  | 'quiz'       // 单选/多选/判断
  | 'ordering'   // 排序题
  | 'matching'   // 连线配对题
  | 'topology'   // 交互拓扑连线题 ★★★★★ (对标 Data Center packet-balls)
  | 'terminal'   // VRP 终端命令填空 ★★★★
  | 'scenario'   // 故障排查情景剧本 ★★★★
  | 'flow_sim';  // 数据流向仿真 ★★★★★★ — 可视化任意系统内部的不可见流程

export type LevelStatus =
  | 'locked'
  | 'unlocked'
  | 'in_progress'
  | 'passed'
  | 'failed';

export interface LevelNode {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: LevelType;
  status: LevelStatus;
  stars: 0 | 1 | 2 | 3;
  /** 前置依赖关卡 ID (对标 Data Center 的 device XP unlock) */
  prerequisites: string[];
  /** 闯关地图坐标 (Phaser.js 渲染用) */
  position: { x: number; y: number };
  /** 该关卡包含的题目 ID 列表 */
  questionIds: string[];
  /** 关卡时间限制(秒), 0=不限时 */
  timeLimitSec: number;
}

// ─── 评分系统 (对标 Data Center XP + money + reputation) ────────────

export interface ScoreResult {
  baseScore: number;
  timeBonus: number;
  comboBonus: number;
  stars: 0 | 1 | 2 | 3;
  xpGained: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string; // ISO timestamp
}

// ─── 排行榜 (对标 Data Center 实时资源/收益看板) ────────────────────

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  totalScore: number;
  rank: number;
  rankChange: number; // +1 = 上升1名, -2 = 下降2名
  stars: number;
  streakDays: number;
}

// ─── 题型: 基础选择题 ──────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  levelId: string;
  type: 'single_choice' | 'multi_choice' | 'true_false';
  content: string;
  options: QuizOption[];
  correctOptionIds: string[];
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  knowledgePointTags: string[];
}

export interface QuizOption {
  id: string;
  text: string;
}

// ─── 题型: 排序题 ──────────────────────────────────────────────────

export interface OrderingQuestion {
  id: string;
  levelId: string;
  type: 'ordering';
  content: string;
  /** 乱序展示的步骤 */
  steps: OrderingStep[];
  /** 正确排列顺序 (step id) */
  correctOrder: string[];
  explanation: string;
}

export interface OrderingStep {
  id: string;
  text: string;
}

// ─── 题型: 连线配对题 ──────────────────────────────────────────────

export interface MatchingQuestion {
  id: string;
  levelId: string;
  type: 'matching';
  content: string;
  leftItems: MatchItem[];
  rightItems: MatchItem[];
  /** 正确配对 [leftId, rightId][] */
  correctPairs: [string, string][];
  explanation: string;
}

export interface MatchItem {
  id: string;
  text: string;
}

// ─── 题型: 交互拓扑连线题 ★★★★★ (对标 Data Center packet-balls) ──

export interface TopologyQuizLevel {
  id: string;
  levelId: string;
  type: 'topology';
  /** 任务描述 e.g. "完成VLAN10的正确连线使PC1能访问Server" */
  task: string;
  /** 网络设备节点 (PC/路由器/交换机/服务器) */
  nodes: DeviceNode[];
  /** 物理连线 (初始可隐藏一部分) */
  edges: Cable[];
  /** 正确连接对 */
  correctConnections: ConnectionPair[];
  /** 答对后激活的数据包流经路径 — 核心视觉效果 */
  packetPath: string[];
  explanation: string;
}

export type DeviceType = 'pc' | 'router' | 'switch' | 'server' | 'firewall' | 'vm' | 'storage';

export interface DeviceNode {
  id: string;
  type: DeviceType;
  label: string;
  /** 拓扑图渲染位置 */
  x: number;
  y: number;
  /** 端口列表 */
  ports: Port[];
  /** 设备配置参数 (VLAN, IP, etc.) */
  config?: Record<string, string>;
}

export interface Port {
  id: string;
  label: string;
  /** 连接到的对端端口 ID */
  connectedTo?: string;
}

export interface Cable {
  id: string;
  fromPortId: string;
  toPortId: string;
  /** 是否初始可见 */
  visible: boolean;
  /** 带宽标签 e.g. "1Gbps" */
  bandwidth?: string;
  /** VLAN 标记 */
  vlan?: number;
}

export interface ConnectionPair {
  fromPortId: string;
  toPortId: string;
}

// ─── 题型: VRP 终端命令填空 ★★★★ ─────────────────────────────────

export interface TerminalQuizLevel {
  id: string;
  levelId: string;
  type: 'terminal';
  /** 任务场景 e.g. "配置SW1的VLAN10, 允许Trunk口通过" */
  scenario: string;
  /** 前置已有命令 (显示在终端中) */
  terminalLines: TerminalLine[];
  /** 需要填空的命令 */
  blankCommands: BlankCommand[];
  /** 答对后终端输出动画文本 */
  successOutput: string;
  explanation: string;
}

export interface TerminalLine {
  prompt: string; // e.g. "<SW1>"
  command: string; // e.g. "system-view"
  output?: string;
}

export interface BlankCommand {
  prompt: string;   // e.g. "[SW1-GigabitEthernet0/0/1]"
  answer: string;   // e.g. "port trunk allow-pass vlan 10"
  hints: string[];   // e.g. ["port", "trunk", "allow-pass"]
  /** 是否接受语义等价答案 */
  fuzzyMatch: boolean;
}

// ─── 题型: 故障排查情景剧本 ★★★★ ──────────────────────────────────

export interface ScenarioQuizLevel {
  id: string;
  levelId: string;
  type: 'scenario';
  /** 剧本开头 — 客户打来的电话/工单描述 */
  opening: string;
  /** 对话/选择树 */
  steps: ScenarioStep[];
  /** 最优路径的步骤 ID 序列 */
  optimalPath: string[];
  explanation: string;
}

export interface ScenarioStep {
  id: string;
  /** 场景描述文字 */
  narrative: string;
  /** 可选的操作 */
  choices: ScenarioChoice[];
}

export interface ScenarioChoice {
  id: string;
  text: string; // e.g. "执行 display ospf peer brief"
  /** 选择后展示的输出文本 */
  resultOutput: string;
  /** 选择后跳转到的下一步 ID */
  nextStepId: string | null; // null = 结束
  /** 这个选择是否在最优路径上 */
  isOptimal: boolean;
}

// ─── 虚拟化/超融合关卡类型 (SmartX ZBS对标) ────────────────────────

export interface VirtualizationLevel {
  id: string;
  levelId: string;
  type: 'vm_placement' | 'storage_replica' | 'fault_recovery';
  task: string;
  /** 集群节点 */
  clusterNodes: ClusterNode[];
  /** 虚拟机列表 */
  vms: VirtualMachine[];
  /** 存储策略 */
  storagePolicy?: StoragePolicy;
  explanation: string;
}

export interface ClusterNode {
  id: string;
  label: string;
  cpuTotal: number;
  cpuUsed: number;
  memoryTotalGB: number;
  memoryUsedGB: number;
  storageTotalTB: number;
  storageUsedTB: number;
  status: 'healthy' | 'warning' | 'failed';
  x: number;
  y: number;
}

export interface VirtualMachine {
  id: string;
  name: string;
  cpuCores: number;
  memoryGB: number;
  storageSizeGB: number;
  /** 当前所在节点 ID */
  nodeId: string;
  status: 'running' | 'migrating' | 'stopped';
}

export interface StoragePolicy {
  replicaCount: 2 | 3;
  /** 纠删码条带 (e.g. "22+1") */
  erasureCoding?: string;
  /** 数据可用率 (e.g. 50% for 2-replica) */
  usableRatio: number;
}

// ─── 题型: 数据流向仿真 ★★★★★★ ──────────────────────────────────────
//
// 通用"让物理不可见的系统内部流程变成肉眼可见"的关卡类型。
// 可视化: ZBS元数据管理、Raft共识、iSCSI写路径、Ceph CRUSH等任意系统内流程。
// 支持三种子模式:
//   observe   — 玩家观察动画流程, 回答关键步骤问题
//   route     — 玩家在决策点选择正确的路由/下一跳
//   failover  — 场景注入故障(节点宕机/网络分区), 玩家主导恢复流程

export type FlowSimMode = 'observe' | 'route' | 'failover';

/** 系统组件节点 (Access/Meta/Chunk/Client/Leader/Follower等) */
export interface FlowSimNode {
  id: string;
  label: string;
  /** 组件角色图标 emoji */
  icon: string;
  /** 组件分类 (client/gateway/control/data/consensus) */
  role: 'client' | 'gateway' | 'control' | 'data' | 'consensus' | 'external';
  x: number;
  y: number;
  /** 是否在 failover 场景中可被标记为故障 */
  faultable: boolean;
  /** 元数据注释 (显示在节点 tooltip 中) */
  annotations?: string[];
}

/** 一次消息/数据包在两节点之间的传输 */
export interface FlowSimStep {
  id: string;
  /** 消息发送方节点 ID */
  from: string;
  /** 消息接收方节点 ID */
  to: string;
  /** 消息/数据包名称 e.g. "Write(block_id, data)" */
  data: string;
  /** 对玩家显示的原理注解, 点击后展开 e.g. "Access向Meta申请写入租约" */
  annotation: string;
  /** 相对延迟 (ms, 用于动画时序调度) */
  delayMs: number;
  /** 消息颜色 (不同颜色区分控制流/数据流/ACK) */
  color?: string;
}

/** 玩家决策点: 在哪条边选择正确的下一跳 */
export interface FlowSimDecision {
  id: string;
  /** 决策发生在哪一步之后 (step id) */
  afterStepId: string;
  /** 决策问题描述 e.g. "这个写请求应该发送到哪3个Chunk节点?" */
  question: string;
  /** 可供选择的目标节点 ID 列表 */
  options: string[];
  /** 正确选项 ID(s) */
  correctOptions: string[];
  /** 选错时显示的反馈 */
  wrongFeedback: string;
  /** 选对时显示的反馈 */
  correctFeedback: string;
}

/** 仿真中可注入的故障事件 (failover 模式使用) */
export interface FlowSimFault {
  id: string;
  /** 故障发生在哪一步之前 (step id) */
  beforeStepId: string;
  /** 受影响的节点 ID */
  affectedNodeId: string;
  /** 故障类型描述 e.g. "Meta Leader 宕机" */
  description: string;
  /** 故障注入后系统应该如何响应 (用于评分) */
  expectedRecoveryStepIds: string[];
}

/**
 * FLOW_SIM 关卡 — 数据流向仿真
 *
 * 无论是 ZBS 元数据写入路径、Raft Leader 选举、iSCSI 块读取,
 * 还是 Ceph CRUSH 数据分布, 都可以用这个类型可视化成游戏关卡。
 *
 * 支持双速播放: playbackSpeed 范围 0.1 (慢动作) ~ 10 (快进)。
 */
export interface FlowSimLevel {
  id: string;
  levelId: string;
  type: 'flow_sim';
  /** 关卡子模式 */
  mode: FlowSimMode;
  /** 任务描述 e.g. "观察ZBS写请求如何经过Access→Meta→Chunk完成三副本写入" */
  task: string;
  /** 系统组件节点列表 */
  nodes: FlowSimNode[];
  /** 按时序排列的消息步骤 */
  steps: FlowSimStep[];
  /** 玩家决策点 (route/failover 模式) */
  decisions: FlowSimDecision[];
  /** 故障注入事件 (failover 模式) */
  faults: FlowSimFault[];
  /** 默认播放速度倍数 (0.1 ~ 10, 默认 1.0) */
  playbackSpeed: number;
  /** 支持的播放速度选项 */
  playbackSpeedOptions: number[];
  /**
   * Mermaid 序列图源码 (Phase 2: 可由 mermaid_to_flow_sim.py 生成或逆向导出)
   * 仅作参考存储, 不影响游戏逻辑
   */
  mermaidSource?: string;
  /**
   * OpenTelemetry Trace ID (Phase 3: 来源于真实系统的 OTLP Trace)
   * 标注本关卡由真实 Trace 回放生成
   */
  sourceTraceId?: string;
  explanation: string;
}

// ─── 课程/租户/用户 ────────────────────────────────────────────────

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  vendor: string; // 华为, 锐捷, SmartX, 华三, etc.
  category: 'network' | 'virtualization' | 'storage' | 'security' | 'cloud';
  coverImageUrl: string;
  levels: LevelNode[];
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  logoUrl: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxUsers: number;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'trainer' | 'learner';
  xp: number;
  level: number;
  totalStars: number;
  achievements: Achievement[];
  createdAt: string;
}

// ─── Phaser.js 闯关地图渲染数据 ────────────────────────────────────

export interface LevelMapData {
  courseId: string;
  nodes: LevelMapNode[];
  edges: LevelMapEdge[];
}

export interface LevelMapNode {
  levelId: string;
  title: string;
  type: LevelType;
  status: LevelStatus;
  stars: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

export interface LevelMapEdge {
  fromLevelId: string;
  toLevelId: string;
  /** 粒子流状态: 已解锁=金色流动, 未解锁=灰色静止, 进行中=加速闪烁 */
  particleState: 'flowing' | 'static' | 'pulsing';
}

// ─── API 响应/请求 ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── 审核系统 (Human-in-the-Loop) ─────────────────────────────────

export type LevelReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface ReviewFeedback {
  reviewer: string;
  action: 'approve' | 'reject' | 'edit';
  feedback: string;
  timestamp: string;
}

export interface SourceQuote {
  chunkId: string;
  quote: string;
  chapterTitle: string;
  relevanceScore: number;
}

/** Multi-agent validation result for a single round */
export interface ValidationRound {
  round: number;
  generatorOutput: GeneratorOutput;
  solverOutput: SolverOutput;
  verdict: 'match' | 'mismatch' | 'ambiguous';
  refiningOrder?: string;
}

export interface GeneratorOutput {
  question: Record<string, unknown>;
  reasoningChain: string[];
  sourceQuotes: SourceQuote[];
}

export interface SolverOutput {
  selectedAnswer: string;
  confidence: number;
  ambiguityFlags: string[];
  reasoning: string;
}

// ─── 叙事状态机 (NarrativeModal) ──────────────────────────────────

export type NarrativeChannel = 'dingtalk' | 'wechat_work' | 'slack' | 'terminal' | 'email';

export interface NarrativeMessage {
  role: string;
  avatar?: string;
  text: string;
  /** 消息样式: normal=普通, danger=红色告警, success=绿色, info=蓝色 */
  style?: 'normal' | 'danger' | 'success' | 'info';
  /** 附件图片 URL (可选, 如截图) */
  imageUrl?: string;
}

export interface NarrativeConfig {
  channel: NarrativeChannel;
  /** 对话标题 (如: "运维值班群") */
  title?: string;
  messages: NarrativeMessage[];
  /** 消息自动播放间隔 (ms, 默认 1500) */
  autoPlayDelayMs: number;
}

// ─── WorldState 沙盒系统 ──────────────────────────────────────────

/** 通用节点状态 — 适用于任何厂商的设备/组件 */
export type WorldNodeStatus =
  | 'normal'
  | 'degraded'
  | 'offline'
  | 'rebooting'
  | 'split_brain'
  | 'recovering'
  | 'overloaded'
  | 'maintenance';

export type NetworkStatus =
  | 'connected'
  | 'partitioned'
  | 'degraded'
  | 'disconnected';

export interface WorldNode {
  id: string;
  label: string;
  /** 通用组件分类 (不限于特定厂商) */
  category: string;
  status: WorldNodeStatus;
  /** 0-1 负载率 */
  load: number;
  /** IO 延迟 (ms) */
  ioLatencyMs: number;
  /** 数据完整性 (0-1, 1=完好) */
  dataIntegrity: number;
  /** 厂商自定义指标 (如 { rebalanceProgress: 0.5, vms: 12 }) */
  metrics: Record<string, number>;
}

export interface WorldLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  status: NetworkStatus;
  /** 带宽利用率 (0-1) */
  bandwidthUsage: number;
  /** 延迟 (ms) */
  latencyMs: number;
}

export interface WorldState {
  nodes: WorldNode[];
  links: WorldLink[];
  /** SLA 剩余分 (满分 100) */
  slaScore: number;
  /** 累计停机时间 (ms) */
  downtimeMs: number;
  /** 操作时间线 */
  timeline: ActionRecord[];
}

export interface ActionRecord {
  actionType: string;
  targetNodeId?: string;
  timestamp: number;
  /** 操作前快照 diff */
  stateBefore: Partial<WorldNode>;
  /** 操作后快照 diff */
  stateAfter: Partial<WorldNode>;
}

/** WorldState 初始配置 (存在 Level JSON 中) */
export interface WorldStateConfig {
  initialNodes: WorldNode[];
  initialLinks: WorldLink[];
  initialSlaScore: number;
}

// ─── 因果律系统 (Consequences Engine) ────────────────────────────

export type ConsequenceSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

export interface ConsequenceAction {
  id: string;
  label: string;
  description: string;
  /** 前置条件: 需要先执行的 actionId 列表 (空=无前置) */
  prerequisites: string[];
  /** 执行效果 — 应用到 WorldState 的 mutations */
  effects: WorldStateMutation[];
  /** 此操作是否在专家推荐路径上 */
  isOptimal: boolean;
  /** 触发灾难的概率 (0-1, 受前置条件影响) */
  disasterProbability: number;
}

export interface WorldStateMutation {
  targetNodeId: string;
  field: string;
  value: unknown;
  /** 延迟执行 (ms, 如: 重启 30 秒后才恢复) */
  delayMs: number;
}

export interface DisasterEvent {
  id: string;
  name: string;
  description: string;
  /** 灾难类型 */
  type: 'split_brain' | 'data_loss' | 'cascading_failure' | 'service_outage' | 'custom';
  severity: ConsequenceSeverity;
  /** 影响的节点 ID 列表 */
  affectedNodeIds: string[];
  /** 造成的损害 */
  damage: DamageReport;
}

export interface DamageReport {
  /** 业务停摆时长 (ms) */
  downtimeMs: number;
  /** SLA 扣分 */
  slaLoss: number;
  /** 数据丢失百分比 (0-1) */
  dataLossPercent: number;
  /** 业务影响描述 */
  businessImpact: string;
}

export interface ConsequencesConfig {
  /** 可选操作列表 */
  actions: ConsequenceAction[];
  /** 专家推荐路径 (actionId 序列) */
  optimalPath: string[];
  /** 可能触发的灾难事件 */
  disasters: DisasterEvent[];
  /** 初始 SLA 分数 */
  initialSlaScore: number;
}

// ─── 通用动画目录系统 (任意厂商/产品适配) ────────────────────────

/**
 * AnimationCatalog — 厂商无关的动画效果映射
 *
 * 核心理念: 将"状态变化"映射到"视觉效果"，而非硬编码特定产品动画。
 * 任何厂商的产品（SmartX、华为、VMware、Nutanix 等）都可以通过
 * 配置 AnimationMapping 来获得对应的视觉效果。
 *
 * 示例:
 * - "node.offline"  → 红色闪烁 + 火花粒子
 * - "link.partitioned" → 连线断裂 + 红闪
 * - "data.rebalance" → 粒子流向转移动画
 * - "consensus.election" → 节点间投票粒子 + leader 高亮
 */

export type AnimationEffectType =
  | 'blink'           // 闪烁 (节点状态变化)
  | 'pulse'           // 脉冲 (正在处理)
  | 'burst'           // 粒子爆发 (操作执行)
  | 'flow_redirect'   // 流向转移 (数据重平衡)
  | 'shake'           // 震动 (错误/故障)
  | 'fade_out'        // 淡出 (节点离线)
  | 'fade_in'         // 淡入 (节点恢复)
  | 'highlight'       // 高亮 (选举/选中)
  | 'spark'           // 火花 (断裂/故障)
  | 'ripple'          // 波纹 (广播/通知)
  | 'trail'           // 拖尾 (数据传输)
  | 'split'           // 分裂 (脑裂/分区)
  | 'merge'           // 合并 (恢复/合并)
  | 'progress_bar'    // 进度条 (重建/迁移)
  | 'heat_map'        // 热力图 (负载可视化)
  | 'countdown'       // 倒计时 (超时/SLA)
  | 'explosion'       // 爆炸 (灾难事件)
  | 'connection_break' // 连线断裂 (网络中断)
  | 'data_scatter';    // 数据散落 (数据丢失)

export interface AnimationEffect {
  type: AnimationEffectType;
  /** 效果颜色 (CSS color) */
  color: string;
  /** 持续时间 (ms) */
  durationMs: number;
  /** 粒子数量 (burst/spark/explosion 使用) */
  particleCount?: number;
  /** 效果强度 (0-1) */
  intensity: number;
  /** 是否循环播放 */
  loop: boolean;
  /** 自定义参数 (如: 进度条百分比, 热力图值) */
  params?: Record<string, unknown>;
}

/**
 * AnimationMapping: 将 WorldState 状态变化映射到一组视觉效果
 *
 * trigger 格式: "{targetType}.{field}.{transition}"
 * 示例:
 * - "node.status.normal→offline"    节点离线
 * - "node.status.offline→rebooting" 节点重启中
 * - "link.status.connected→partitioned" 网络分区
 * - "node.load.threshold_high"      负载超阈值
 * - "node.dataIntegrity.threshold_low" 数据完整性低
 */
export interface AnimationMapping {
  id: string;
  /** 触发条件 (状态变化模式) */
  trigger: string;
  /** 触发的动画效果列表 (可同时播放多个) */
  effects: AnimationEffect[];
  /** 优先级 (高优先级覆盖低优先级) */
  priority: number;
  /** 描述 (调试/管理用) */
  description: string;
}

/**
 * 预置动画模板 — 通用 IT 基础设施动画
 * 厂商可以覆盖/扩展这些默认映射
 */
export interface AnimationCatalog {
  /** 唯一标识 (如: "default", "smartx-halo", "huawei-fusioncompute") */
  id: string;
  /** 目录名称 */
  name: string;
  /** 适用厂商 (空=通用) */
  vendor?: string;
  /** 状态变化 → 动画效果映射表 */
  mappings: AnimationMapping[];
}

// ─── 专家对比复盘时间线 (Expert Comparison Timeline) ────────────────

export type TimelineStepStatus = 'correct' | 'warning' | 'error' | 'expert-only';

export interface TimelineStep {
  id: string;
  /** 相对时间（秒） */
  timestamp: number;
  actionName: string;
  status: TimelineStepStatus;
  description: string;
  /** 对 SLA 或风险的影响分 (-100 ~ 0) */
  impactScore: number;
  /** RAG 关联的文档原文 */
  sourceQuote?: string;
  /** 当前操作后的状态快照（用于 Canvas 回滚） */
  worldStateSnapshot: unknown;
  /** 如果是错误操作，说明偏离原因 */
  deviationNotice?: string;
}

export interface ReplayDataSummary {
  userTime: number;
  expertTime: number;
  score: number;
  slaLoss: string;
}

export interface ReplayData {
  summary: ReplayDataSummary;
  playerSteps: TimelineStep[];
  /** 专家最优路径的参考步骤 */
  expertSteps: TimelineStep[];
}

export interface DeviationPoint {
  playerStep: TimelineStep;
  expertStep: TimelineStep;
  /** 时间偏移量（秒） */
  timeOffset: number;
  /** 风险增量 */
  riskDelta: number;
}

// ─── 硬核仿真交互系统 (Hardcore Simulation Tool System) ────────────
//
// 从"点选按钮"进化为"物理工具交互":
// 用户通过 Probe/Cutter/Booster/Linker/Migrator/Freezer 六大工具
// 直接干预系统运行, 配合粒子物理引擎实现沉浸式操作。

/** 工具类型 — 对应六种"物理交互工具" */
export type ToolType =
  | 'probe'    // 听诊器: 探测节点性能指标
  | 'cutter'   // 手术刀: 切断连接, 模拟网络分区
  | 'booster'  // 加压泵: 增加节点负载, 模拟流量冲击
  | 'linker'   // 重建器: 重建连接, 修复路径
  | 'migrator' // 磁力吸: 拖拽数据块迁移
  | 'freezer'; // 冻结时钟: 暂停粒子流, 观察一致性快照

/** 工具状态 */
export type ToolStatus = 'idle' | 'active' | 'cooldown' | 'disabled';

/** 单个工具的完整状态 */
export interface ToolState {
  type: ToolType;
  status: ToolStatus;
  /** 冷却剩余时间 (ms) */
  cooldownRemainingMs: number;
  /** 冷却总时间 (ms) */
  cooldownTotalMs: number;
  /** 使用次数 (关卡内) */
  usageCount: number;
  /** 最大使用次数 (-1=无限) */
  maxUsage: number;
}

/** 工具动作 — 用户对某个目标执行工具操作 */
export interface ToolAction {
  /** 唯一动作 ID */
  id: string;
  /** 使用的工具 */
  tool: ToolType;
  /** 目标实体 ID (节点或连接) */
  targetId: string;
  /** 可选: 第二目标 (如 Migrator 的目的节点, Linker 的连接终点) */
  secondaryTargetId?: string;
  /** 动作发生时间戳 */
  timestamp: number;
}

/** 工具动作执行结果 */
export interface ToolActionResult {
  success: boolean;
  message: string;
  /** 对 WorldState 的变更 */
  mutations: WorldStateMutation[];
  /** 触发的视觉效果 trigger */
  visualTriggers: string[];
  /** 如果是 Probe, 返回探测数据 */
  probeData?: ProbeData;
}

/** Probe 探测返回的节点详细指标 */
export interface ProbeData {
  nodeId: string;
  /** IO 深度 */
  ioDepth: number;
  /** IO 延迟曲线采样点 (ms) */
  latencySamples: number[];
  /** IOPS */
  iops: number;
  /** 吞吐量 (MB/s) */
  throughputMBps: number;
  /** 副本同步状态 */
  replicaSync: Record<string, 'synced' | 'lagging' | 'lost'>;
}

/**
 * 操作序列定义 — 关卡要求玩家按特定顺序使用工具
 *
 * 不再是单选题, 而是"先 Probe 发现瓶颈 → 再 Cutter 切断旧路径
 * → 最后 Linker 重建新路径"的操作序列。
 */
export interface ToolSequence {
  /** 序列 ID */
  id: string;
  /** 序列描述 */
  description: string;
  /** 必须执行的步骤 (按顺序) */
  requiredSteps: ToolSequenceStep[];
  /** 步骤之间的最大间隔 (ms), 超过则判定'操作失误' */
  maxIntervalMs: number;
  /** 整个序列的时间限制 (ms) */
  timeLimitMs: number;
}

/** 操作序列中的单个步骤 */
export interface ToolSequenceStep {
  /** 步骤序号 (从 0 开始) */
  index: number;
  /** 要求使用的工具 */
  requiredTool: ToolType;
  /** 要求的目标节点/连接 ID (null=任意目标) */
  requiredTargetId: string | null;
  /** 步骤提示文字 */
  hint: string;
}

/** 操作序列验证结果 */
export interface SequenceValidationResult {
  /** 是否完成 */
  completed: boolean;
  /** 当前进行到第几步 */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 是否有操作失误 */
  hasMistake: boolean;
  /** 失误原因 */
  mistakeReason?: string;
  /** 剩余时间 (ms) */
  remainingMs: number;
}

// ─── 粒子物理引擎状态 ──────────────────────────────────────────────

/** 单条连接的粒子物理参数 */
export interface ParticlePhysics {
  /** 连接 ID */
  connectionId: string;
  /** 粒子密度 (数量/连接, 基础值来自 ParticleConfig.density) */
  density: number;
  /** 粒子速度 (px/s) */
  velocity: number;
  /** 粒子粘度 (0=自由流动, 1=完全凝滞) — 模拟延迟 */
  viscosity: number;
  /** 粒子颜色 (动态变化: 正常=蓝, 高压=红) */
  color: string;
  /** 粒子大小 (px) */
  size: number;
  /** 是否冻结 */
  frozen: boolean;
}

/** 单个节点的物理状态 */
export interface NodePhysics {
  /** 节点 ID */
  nodeId: string;
  /** 呼吸闪烁相位 (0-2π, 用于正弦振荡) */
  breathPhase: number;
  /** 呼吸闪烁频率 (Hz): 正常=0.5, 告警=2.0 */
  breathFrequency: number;
  /** 热力值 (0=冷, 1=炽热) — 映射到颜色梯度 */
  heatValue: number;
  /** 震动强度 (0=静止, 1=剧烈) */
  shakeIntensity: number;
  /** 震动衰减速率 (每秒降低多少) */
  shakeDamping: number;
}

/** 全局物理引擎状态 */
export interface PhysicsState {
  /** 所有连接的粒子物理参数 */
  particles: ParticlePhysics[];
  /** 所有节点的物理状态 */
  nodes: NodePhysics[];
  /** 全局时间冻结 */
  globalFrozen: boolean;
  /** 全局屏幕震动 (Booster 等操作触发) */
  screenShake: { intensity: number; remainingMs: number };
  /** 是否处于 X-Ray 模式 (显示元数据神经网络) */
  xrayMode: boolean;
}

/** 物理引擎 tick 更新的输入 */
export interface PhysicsTickInput {
  /** 距上次 tick 的时间差 (ms) */
  deltaMs: number;
  /** 当前 WorldState (用于驱动物理参数) */
  worldNodes: WorldNode[];
  worldLinks: WorldLink[];
}
