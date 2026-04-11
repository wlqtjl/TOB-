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
  | 'scenario';  // 故障排查情景剧本 ★★★★

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
