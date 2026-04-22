# SkillQuest 软件架构文档

> 本文档记录 SkillQuest 平台的整体架构、页面路由、类型系统以及重要变更日志。
> 每次涉及跨文件、跨模块的改动，都应在本文档「变更日志」章节追加记录，防止遗漏。

---

## 目录

1. [项目结构](#1-项目结构)
2. [技术栈](#2-技术栈)
3. [前端页面路由表](#3-前端页面路由表)
4. [共享类型系统 (`@skillquest/types`)](#4-共享类型系统)
5. [游戏引擎 (`@skillquest/game-engine`)](#5-游戏引擎)
6. [关卡知识普及系统 (Level Briefing)](#6-关卡知识普及系统)
7. [数据引力场 (`/data-gravity`)](#7-数据引力场)
8. [ZBS 数据流可视化 (`/data-gravity/story`)](#8-zbs-数据流可视化)
9. [情景选择关 (Scenario Decision)](#9-情景选择关)
10. [关卡叙事系统 (Level Narrative)](#10-关卡叙事系统)
11. [UI 界面截图 (UI Screenshots)](#11-ui-界面截图)
12. [变更日志](#12-变更日志)

---

## 1. 项目结构

```
SkillQuest/
├── apps/
│   ├── web/                          # Next.js 15 (App Router) — 前端
│   │   ├── src/app/
│   │   │   ├── (game)/               # 游戏端 (员工闯关)
│   │   │   │   ├── map/              # 🗺️ 闯关地图
│   │   │   │   ├── level/[id]/       # 📝 关卡答题 + 知识普及弹窗
│   │   │   │   ├── play/[type]/[id]/ # 🎮 游戏播放器
│   │   │   │   ├── leaderboard/      # 🏆 排行榜
│   │   │   │   └── replay/           # 🔁 专家对比复盘
│   │   │   ├── data-gravity/         # 🧲 ZBS 数据分布仿真 (Canvas 物理引擎)
│   │   │   │   └── story/            # 🎬 ZBS 数据流可视化 (五场景交互叙事)
│   │   │   ├── dashboard/            # 📊 学员仪表盘
│   │   │   ├── admin/                # ⚙️ 管理后台
│   │   │   ├── login/                # 🔐 登录
│   │   │   ├── register/             # 📝 注册
│   │   │   ├── showcase/             # 🎨 产品介绍
│   │   │   └── ...
│   │   ├── src/components/
│   │   │   ├── game/                 # 游戏相关组件
│   │   │   │   ├── LevelBriefingModal.tsx   # 关卡前知识普及弹窗
│   │   │   │   ├── UniversalGameRenderer.tsx
│   │   │   │   ├── ZBSFlowViz.tsx           # ZBS 五场景交互叙事可视化
│   │   │   │   ├── ScenarioGameRenderer.tsx # 情景选择关渲染器
│   │   │   │   └── LevelIntroModal.tsx      # 关卡叙事入口弹窗
│   │   │   ├── sandbox/              # GPSL v1.1 交互沙盒组件
│   │   │   ├── layout/               # 布局组件 (Navbar, AdminSidebar)
│   │   │   └── ui/                   # 通用 UI 组件
│   │   └── src/lib/
│   │       ├── mock-courses/         # Mock 课程数据
│   │       │   └── briefing-data.ts  # 关卡知识普及配置
│   │       └── auth-context.tsx      # 认证上下文
│   │
│   └── api/                          # NestJS 后端
│       ├── src/modules/
│       │   ├── auth/                 # JWT + 企业SSO + TenantGuard
│       │   ├── course/               # 课程管理 + AI 生成
│       │   ├── game-engine/          # 游戏状态机
│       │   ├── leaderboard/          # Redis 排行榜
│       │   └── analytics/            # 学习数据分析
│       └── prisma/                   # 数据库 Schema
│
├── packages/
│   ├── types/                        # @skillquest/types — 共享 TypeScript 类型
│   │   └── src/index.ts              # 所有类型定义 (LevelBriefing, DataParticle, etc.)
│   └── game-engine/                  # @skillquest/game-engine — 游戏引擎核心
│       ├── level-state-machine       # 关卡 DAG 状态机
│       ├── scoring-engine            # XP + combo + star 评分
│       ├── topology-engine           # BFS 拓扑连线验证
│       ├── combo-tracker             # 连击追踪
│       └── data-gravity/             # 数据引力场物理引擎
│
├── services/
│   └── ai-engine/                    # Python FastAPI — AI 引擎
│
└── infra/
    ├── docker-compose.yml            # PostgreSQL + Redis + API + Web + AI
    └── Dockerfile.*                  # 各服务容器
```

---

## 2. 技术栈

| 层级 | 技术 | 用途 |
|---|---|---|
| 前端框架 | Next.js 15 (App Router) | SSR + 路由 |
| 游戏引擎 | Phaser.js 3 / PixiJS / Canvas 2D | 粒子流 + 交互动画 |
| 图可视化 | Cytoscape.js | 拓扑图渲染 |
| UI 样式 | Tailwind CSS | 响应式布局 (Light Minimalist 主题) |
| 动画 | framer-motion | 交互动画 (GPSL v1.1) |
| 后端框架 | NestJS 10 | REST API + WebSocket |
| 实时通信 | Socket.io | 排行榜推送 |
| 数据库 | PostgreSQL 16 | 业务数据 |
| 缓存/排行 | Redis 7 | Sorted Set 排行榜 |
| AI 引擎 | FastAPI + GPT-4o / Gemini | 题目生成 + 拓扑识别 |
| 构建工具 | Turborepo + pnpm | Monorepo 管理 |
| 容器化 | Docker Compose | 本地开发 + 部署 |

---

## 3. 前端页面路由表

### 公共页面
| 路由 | 文件 | 说明 |
|---|---|---|
| `/` | `app/page.tsx` | 首页 |
| `/login` | `app/login/page.tsx` | 登录 |
| `/register` | `app/register/page.tsx` | 注册 |
| `/setup-vendor` | `app/setup-vendor/page.tsx` | 平台初始化 (BOOTSTRAP_TOKEN) |
| `/showcase` | `app/showcase/page.tsx` | 产品介绍 |

### 学员端 (LEARNER)
| 路由 | 文件 | 说明 |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | 学员仪表盘 |
| `/map` | `app/(game)/map/page.tsx` | 闯关地图 |
| `/level/[id]` | `app/(game)/level/[id]/page.tsx` | 关卡答题 (含 LevelBriefingModal) |
| `/play/[type]/[id]` | `app/(game)/play/[type]/[id]/page.tsx` | 游戏播放器 |
| `/play/sandbox` | `app/(game)/play/sandbox/page.tsx` | 交互沙盒 (GPSL v1.1) |
| `/leaderboard` | `app/(game)/leaderboard/page.tsx` | 排行榜 |
| `/results` | `app/results/page.tsx` | 关卡结算 |
| `/replay` | `app/replay/page.tsx` | 专家对比复盘 |
| `/achievements` | `app/achievements/page.tsx` | 成就系统 |
| `/profile` | `app/profile/page.tsx` | 个人资料 |
| `/analytics` | `app/analytics/page.tsx` | 学习分析 |
| `/learning-path` | `app/learning-path/page.tsx` | 学习路径 |
| `/daily` | `app/daily/page.tsx` | 每日任务 |

### 管理端 (ADMIN)
| 路由 | 文件 | 说明 |
|---|---|---|
| `/courses` | `app/courses/page.tsx` | 课程管理 |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | 管理端数据看板 |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | KPI 数据看板 |
| `/admin/users` | `app/admin/users/page.tsx` | 用户管理 |
| `/admin/partners` | `app/admin/partners/page.tsx` | 团队管理 |
| `/admin/courses` | `app/admin/courses/page.tsx` | 课程管理 (Admin) |
| `/admin/review` | `app/admin/review/page.tsx` | 审核中心 |
| `/admin/spark` | `app/admin/spark/page.tsx` | Spark 3DGS 管理后台 |

### TRAINER 端
| 路由 | 文件 | 说明 |
|---|---|---|
| `/courses/agency` | `app/courses/agency/page.tsx` | 代理商课程管理 |

### 特殊页面
| 路由 | 文件 | 说明 |
|---|---|---|
| `/data-gravity` | `app/data-gravity/page.tsx` | **ZBS 数据分布仿真**（Canvas 物理引擎，关卡 l2 前置互动预习，含故事/仿真模式切换）|
| `/data-gravity/story` | `app/data-gravity/story/page.tsx` | **ZBS 数据流可视化**（五场景交互叙事模式，framer-motion 动画）|
| `/play/spark_3dgs/*` | `app/(game)/play/[type]/[id]/page.tsx` | **Spark 2.0 3DGS 演练** — SmartX 替换 VMware 沉浸式关卡（3 阶段点云场景 + 热点答题）|

---

## 4. 共享类型系统

文件: `packages/types/src/index.ts`

### 核心类型

| 类型 | 用途 |
|---|---|
| `LevelType` | 关卡题型枚举：`choice`、`topology`、`terminal`、`scenario`、`flow_sim`、`sandbox`、`scenario_decision` |
| `LevelNode` | 关卡节点 |
| `ScoreResult` | 评分结果 |
| `LevelBriefing` | 关卡前知识普及配置 |
| `KnowledgePoint` | 知识点条目 |
| `LevelObjective` | 关卡任务目标 |
| `DataGravityState` | 数据引力场仿真状态 |
| `GravityNode` | 引力节点 |
| `DataParticle` | 数据粒子 |
| `EnergyMetrics` | 能量指标 |
| `GravityGunToolType` | 引力枪工具类型 |
| `SandboxSimConfig` | 沙盒模拟配置 (GPSL v1.1) |
| `ZBSScene` | ZBS 可视化场景定义（id 1-5, title, description, interactable） |
| `CHUNK_COLORS` | ZBS 数据块颜色方案（chunk1-4, const assertion） |
| `ZBSNodeState` | 存储节点状态：`normal` \| `active` \| `failed` \| `recovering` \| `recovered` |
| `ZBSFlowVizProps` | ZBS 可视化组件 props（onComplete, courseId, levelId） |
| `LevelNarrative` | 关卡背景叙事（title, hook, protagonist, missionBrief, successMessage, failureMessage） |
| `ScenarioDecisionChoice` | 情景选择题选项（id, text, isCorrect, consequence） |
| `ScenarioDecisionQuestion` | 情景选择题数据（scenario, role, choices, correctRationale, knowledgePoint） |
| `GameRendererProps` | 游戏渲染器通用 Props（levelId, courseId, onComplete, onAnswer, skipIntro） |

### `LevelBriefing` 接口（含 `interactiveDemo`）

```typescript
export interface LevelBriefing {
  levelId: string;
  title: string;
  summary: string;
  knowledgePoints: KnowledgePoint[];
  objectives: LevelObjective[];
  gameTypeHint: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tips?: string[];
  /** 可选：关卡前互动演示入口 (v1.2 新增) */
  interactiveDemo?: {
    href: string;        // 跳转路径
    label: string;       // 按钮文字
    description: string; // 说明这个 demo 和本关的关系
  };
}
```

### `LevelNarrative` 接口（关卡叙事系统）

```typescript
export interface LevelNarrative {
  /** 关卡标题 (如 "第3关：ZBS的守护者") */
  title: string;
  /** 开场引子 (如 "北京某代理商IDC机房，凌晨3点警报响起...") */
  hook: string;
  /** 主角设定 (如 "你是刚入职的运维工程师李志远") */
  protagonist: string;
  /** 任务简报 (如 "今晚必须处理3个告警，保证业务不中断") */
  missionBrief: string;
  /** 通关成功文案 */
  successMessage: string;
  /** 通关失败文案 */
  failureMessage: string;
}
```

### `ScenarioDecisionQuestion` 接口（情景选择关题目）

```typescript
export interface ScenarioDecisionChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  /** 选择此选项后的后果描述 */
  consequence: string;
}

export interface ScenarioDecisionQuestion {
  /** 情景描述 */
  scenario: string;
  /** 角色设定 */
  role: string;
  /** 选项列表 */
  choices: ScenarioDecisionChoice[];
  /** 正确答案解析 */
  correctRationale: string;
  /** 知识点提炼 */
  knowledgePoint: string;
}
```

### `ZBSScene` 接口（ZBS 可视化场景）

```typescript
export interface ZBSScene {
  id: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  interactable: boolean;
}

export const CHUNK_COLORS = {
  chunk1: '#6366F1',  // 靛紫
  chunk2: '#22C55E',  // 绿
  chunk3: '#F59E0B',  // 橙
  chunk4: '#EC4899',  // 粉
} as const;
```

---

## 5. 游戏引擎

文件: `packages/game-engine/`

| 模块 | 说明 |
|---|---|
| `level-state-machine` | 关卡 DAG 状态机 |
| `scoring-engine` | XP + combo + star 三维度评分 |
| `topology-engine` | BFS 拓扑连线验证 |
| `combo-tracker` | 连击追踪 |
| `data-gravity/` | 数据引力场物理引擎（粒子运动、节点引力、故障注入、副本检测） |

---

## 6. 关卡知识普及系统

### 涉及文件

| 文件 | 作用 |
|---|---|
| `packages/types/src/index.ts` | `LevelBriefing` 接口定义 |
| `apps/web/src/lib/mock-courses/briefing-data.ts` | 各关卡知识普及数据 (Mock) |
| `apps/web/src/components/game/LevelBriefingModal.tsx` | 知识普及弹窗渲染组件 |

### 弹窗结构

```
┌──────────────────────────────────────────────────┐
│ [BookOpen] 关卡标题                               │
│ 关卡简介                                         │
├──────────────────────────────────────────────────┤
│ [Gamepad2] 选择题  [Clock] 约 3 分钟  [入门]      │
├──────────────────────────────────────────────────┤
│ [BookOpen] 本关知识点                             │
│   ├─ ZBS (可展开)                                │
│   ├─ 数据副本 (可展开)                            │
│   └─ ...                                         │
│                                                   │
│ [Target] 本关目标                                 │
│   ├─ ● 理解 ZBS 分布式存储的基本工作原理           │
│   └─ ○ 了解数据重建的触发条件和过程 (可选)         │
│                                                   │
│ [FlaskConical] 互动预习 ← (仅 interactiveDemo 存在时渲染)
│   ├─ 描述文字                                    │
│   ├─ [🧲 互动体验：ZBS 数据分布模拟器] → /data-gravity (target=_blank)
│   └─ 在新标签页体验后，回到此页面点击"开始闯关"    │
│                                                   │
│ [Lightbulb] 小贴士                               │
│   ├─ • 2 副本 = 数据存 2 份                      │
│   └─ • 纠删码空间利用率更高                       │
├──────────────────────────────────────────────────┤
│ [跳过]                      [开始闯关 →]          │
└──────────────────────────────────────────────────┘
```

### 互动演示数据流

```
LevelBriefing.interactiveDemo
  ↓ (briefing-data.ts 中配置)
LevelBriefingModal.tsx
  ↓ (渲染 Link 组件)
/data-gravity (target="_blank")
  ↓ (用户在新标签页体验)
返回弹窗 → 点击"开始闯关"
```

---

## 7. 数据引力场

### 页面定位

| 属性 | 值 |
|---|---|
| 路由 | `/data-gravity` |
| 文件 | `apps/web/src/app/data-gravity/page.tsx` |
| 定位 | **ZBS 分布式存储关卡 (l2) 的前置互动预习** |
| 引擎 | Canvas 2D 物理仿真 (`@skillquest/game-engine` data-gravity 模块) |
| 关联关卡 | `l2`（ZBS 分布式存储） |

### UI 术语 ↔ ZBS 知识点映射

#### 工具栏 (TOOLS)

| 工具 ID | 当前 UI 标签 | ZBS 知识点对应 |
|---|---|---|
| `gravity_anchor` | **副本锚定** | 在指定位置创建强副本亲和锚，数据块向此处汇聚 |
| `force_shield` | **网络隔离** | 划定网络分区屏障，模拟交换机故障或网络隔离 |
| `the_lens` | **副本检测** | 框选区域内查看各数据块所属的副本组 (replicaId) |
| `singularity` | **节点故障注入** | 双击注入节点故障，触发数据重建流量 |

#### 右侧能量指标面板

| 当前 UI 标签 | 对应物理量 | ZBS 语义 |
|---|---|---|
| **IO 速率 (读写吞吐)** | `kineticEnergy` | 所有数据块的运动能量 ≈ 读写 IO |
| **节点负载压力** | `potentialEnergy` | 节点间引力势能 ≈ 负载分布 |
| **带宽损耗率** | `bandwidthLossRate` | 跨节点传输带宽消耗 |
| **数据分布混乱度** | `entropyDelta` | 数据分布的熵变化量 |
| **数据迁移总量 (MB)** | `displacement` | 粒子位移总和 ≈ 数据迁移量 |
| **数据混乱度历史** | entropy sparkline | 数据分布混乱度趋势图 |

#### 左侧参数面板

| 当前 UI 标签 | 说明 |
|---|---|
| **副本亲和力 G = {value}** | 引力常数 — 数值越大数据块越紧密聚集 |
| **带宽上限系数 = {value}** | 摩擦力 — 模拟带宽上限对迁移速度的约束 |
| **数据块 (16MB chunk): {count}** | 当前仿真中的数据块数量 |

#### 节点状态区

| 项目 | 当前值 |
|---|---|
| 区块标题 | **ZBS 存储节点状态** |
| 状态翻译 | `normal` → `正常`，`failed` → `已故障`，`overloaded` → `过载` |
| 状态翻译实现 | `NODE_STATUS_LABELS` 常量对象（lookup table） |

#### 其他 UI 元素

| 元素 | 当前文本 |
|---|---|
| 重置按钮 | **重置模拟** |
| Canvas 标题条 | **ZBS 数据分布仿真 — 副本亲和力驱动的分布式存储模型** |
| 返回关卡按钮 | `← 返回关卡`（仅当 `?from=level` 参数存在时显示） |

### ZBS 知识背景横幅

位于左侧面板顶部（`返回首页` 链接下方），内容：

```
本页面模拟 ZBS 分布式块存储的数据分布原理：
• 粒子 = 数据块（16MB chunk）
• 存储节点 = ZBS 物理存储节点
• 引力 = 节点副本亲和度
• 节点故障时，粒子自动向健康节点迁移 = 数据重建
```

### URL 参数

| 参数 | 值 | 效果 |
|---|---|---|
| `from` | `level` | 显示「← 返回关卡」按钮 |
| `levelId` | 关卡 ID (默认 `2`) | 返回按钮链接到 `/level/{levelId}` |

完整入口 URL 示例: `/data-gravity?from=level&levelId=2`

---

## 8. ZBS 数据流可视化

### 页面定位

| 属性 | 值 |
|---|---|
| 路由 | `/data-gravity/story` |
| 文件 | `apps/web/src/app/data-gravity/story/page.tsx` |
| 核心组件 | `apps/web/src/components/game/ZBSFlowViz.tsx` |
| 定位 | **ZBS 分布式存储的故事化叙事教学**，用非技术用户能理解的方式讲解 ZBS 原理 |
| 动画库 | framer-motion（项目已有依赖，无 Three.js） |
| 关联关卡 | `l2`（ZBS 分布式存储） |

### 设计原则

1. **用用户熟悉的现实事物作类比** — 副本=备份U盘，节点=仓库，分片=把书撕成三份
2. **分步可操控，不要一次全展示** — 5个场景逐步推进，用户点"下一步"触发
3. **动画描述"结果"而非"过程"** — 不展示数据包传输细节，展示"3台机器都亮了，数据安全了"

### 五场景结构

| 场景 | 标题 | 描述 | 可交互 |
|---|---|---|---|
| 1 | 文件写入 | 文件自动切成 4 个 Chunk | 否 |
| 2 | 数据分布 | 4 个数据块分布到 3 个节点 | ✅ 可点击节点查看详情 |
| 3 | 节点故障 | 一台机器故障，自动恢复副本 | 否 |
| 4 | 副本策略 | 滑块调整副本数，实时计算安全性/存储占用 | ✅ 滑块交互 |
| 5 | 数据读取 | 就近路由选择最快节点，拼合返回完整文件 | 否 |

### 数据块颜色方案

| 数据块 | 颜色 | 色值 |
|---|---|---|
| Chunk 1 (C1) | 靛紫 | `#6366F1` |
| Chunk 2 (C2) | 绿 | `#22C55E` |
| Chunk 3 (C3) | 橙 | `#F59E0B` |
| Chunk 4 (C4) | 粉 | `#EC4899` |

### 与关卡的联动

```
用户进入第2关（ZBS存储原理）
    ↓
LevelBriefingModal 显示"互动预习"卡片
    ↓ 点击
/data-gravity/story?from=level&levelId=2
    ↓ 5个场景约3分钟
点击"我看懂了" → onComplete → 返回 /level/2
    ↓
游戏关卡正式开始
```

### 模式切换

`/data-gravity` 页面左侧面板提供模式切换器：

- 🎬 **故事模式** → `/data-gravity/story` — 非技术用户友好的叙事教学
- ⚛️ **仿真模式** → `/data-gravity` — 物理粒子仿真（面向技术用户）

---

## 9. 情景选择关

### 概述

| 属性 | 值 |
|---|---|
| 关卡类型 | `scenario_decision` |
| 渲染组件 | `apps/web/src/components/game/ScenarioGameRenderer.tsx` |
| 适用知识点 | 操作流程、故障处理、最佳实践 |
| 数据来源 | `apps/web/src/lib/mock-courses/play-content.ts` |

### 核心体验

用户扮演一个角色（如"运维工程师张工"），遇到真实情景，做出选择。每个选择都有后果展示 + 知识点提炼。

### UI 结构

```
┌─────────────────────────────────────────────────────────┐
│  🎭 角色名，情景描述：                                   │
│                                                         │
│  "ZBS 集群中 Node-3 状态变为 WARNING，                  │
│   磁盘使用率达到 87%"                                   │
│                                                         │
│  [A] 选项1                                              │
│  [B] 选项2                                              │
│  [C] 选项3 ← 正确                                      │
│  [D] 选项4                                              │
└─────────────────────────────────────────────────────────┘

选择后 →

┌─────────────────────────────────────────────────────────┐
│  ✅/❌ 选择结果                                          │
│  🎬 后果叙述                                             │
│  💡 知识点提炼                                           │
│  [继续 →]                                               │
└─────────────────────────────────────────────────────────┘
```

### 评分机制

```typescript
function calculateStars(correctCount: number, totalQuestions: number): 0 | 1 | 2 | 3 {
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  if (percentage >= 90) return 3;   // ★★★
  if (percentage >= 70) return 2;   // ★★
  if (percentage >= 50) return 1;   // ★
  return 0;
}
// score = Math.round((correctCount / totalQuestions) * 100)
```

### 路由与适配

- **路由**: `/play/scenario_decision/{id}?course={courseId}`
- **适配**: `scenario_decision` 类型**不使用** `UniversalGameRenderer` 适配器模式
- **渲染**: 直接由 `ScenarioGameRenderer` 组件渲染
- **原因**: 情景选择关的 UI 结构（角色扮演 + 后果叙事）与通用渲染器差异较大

### 涉及文件

| 文件 | 作用 |
|---|---|
| `packages/types/src/index.ts` | `ScenarioDecisionChoice`, `ScenarioDecisionQuestion` 类型 |
| `apps/web/src/components/game/ScenarioGameRenderer.tsx` | 情景选择关渲染器 |
| `apps/web/src/lib/mock-courses/play-content.ts` | Mock 情景选择题数据（3道 ZBS 守护者任务题） |
| `apps/web/src/app/(game)/play/[type]/[id]/page.tsx` | 路由分发，`scenario_decision` 类型的特殊处理 |

---

## 10. 关卡叙事系统

### 概述

让游戏"感觉像游戏"而不是"考试"。进入关卡时展示角色扮演场景，让每一关都有叙事连续性。

### 涉及文件

| 文件 | 作用 |
|---|---|
| `packages/types/src/index.ts` | `LevelNarrative` 接口定义 |
| `apps/web/src/components/game/LevelIntroModal.tsx` | 关卡叙事入口弹窗 |
| `apps/web/src/lib/mock-courses/play-content.ts` | Mock 叙事数据 |

### LevelIntroModal UI 结构

```
╔════════════════════════════════════════╗
║  🎮 第N关：{narrative.title}           ║
║                                        ║
║  {narrative.hook}                      ║
║                                        ║
║  👤 你的角色：{narrative.protagonist}   ║
║  📋 任务：{narrative.missionBrief}      ║
║                                        ║
║  [📋 查看任务背景]  [⚡ 直接开始]      ║
╚════════════════════════════════════════╝
```

### 使用方式

`LevelIntroModal` 目前仅在 `scenario_decision` 关卡类型中使用。进入关卡时，如果 `play-content.ts` 中配置了 `narrative` 字段，将自动弹出叙事弹窗。用户点击"直接开始"后，弹窗关闭，游戏正式开始。

### 叙事数据流

```
play-content.ts (narrative 配置)
    ↓
play/[type]/[id]/page.tsx (读取 narrative)
    ↓ narrative && !introDismissed
LevelIntroModal (弹窗渲染)
    ↓ onStart
setIntroDismissed(true) → ScenarioGameRenderer (游戏开始)
    ↓ onComplete
narrative.successMessage / narrative.failureMessage (结算展示)
```

---

## 11. UI 界面截图

> **🛡️ 维护规则 (重要 — 不要忽略!)**
>
> 1. 本节是 **整个软件的 UI 截图档案**，每张图片对应一个真实路由。任何新增 / 删除 / 重命名路由的改动，**必须同步更新** `SkillQuest/docs/screenshots/` 目录下的对应截图，并在下表中更新条目。
> 2. 当页面视觉发生重大变化（布局、配色、关键组件重构）时，**必须**重新生成受影响的截图。
> 3. 截图标准：Chromium headless，1280×900 视口，`fullPage: true`，PNG 格式，文件名需与下表 `截图` 列完全一致。
> 4. 所有截图必须在安装中文字体 (`fonts-noto-cjk`) 的环境下生成，防止出现"豆腐框"乱码。
> 5. **严禁删除本节**。PR Review 时若发现此节缺失或被简化，应直接打回。
>
> 最近一次全量回归：**2026-04-21**，基于 `pnpm start` 生产构建产物 (Next.js 15.5.15 App Router) + 后端离线模式 (mock + localStorage)。

### 11.1 截图索引

| # | 路由 | 角色 | 说明 | 截图 |
|---|------|------|------|------|
| 01 | `/` | 公共 | 首页 — SmartX 培训学院门户，危机模拟器 CTA、5分钟冲刺、实时排行榜、4 门课程、快速入口 | [`01-home.png`](screenshots/01-home.png) |
| 02 | `/login` | 公共 | 登录页 + 演示模式三选一（管理员 / 培训师 / 学员） | [`02-login.png`](screenshots/02-login.png) |
| 03 | `/register` | 公共 | 学员注册页 | [`03-register.png`](screenshots/03-register.png) |
| 04 | `/showcase` | 公共 | 产品动态展示页 — 七大能力、8 种关卡类型、四层架构、工作流程 | [`04-showcase.png`](screenshots/04-showcase.png) |
| 05 | `/setup-vendor` | 初始化 | 平台首次部署配置（引导令牌 + 超级管理员账号） | [`05-setup-vendor.png`](screenshots/05-setup-vendor.png) |
| 10 | `/map` | 学员 | 闯关地图（Canvas 粒子流 DAG 图 + 课程切换） | [`10-map.png`](screenshots/10-map.png) |
| 11 | `/leaderboard` | 学员 | 实时排行榜（本周 / 本月 / 赛季 / 全部） | [`11-leaderboard.png`](screenshots/11-leaderboard.png) |
| 12 | `/courses` | 培训师 / 管理员 | 课程管理后台（卡片视图 + 闯关/排行/演示入口） | [`12-courses.png`](screenshots/12-courses.png) |
| 13 | `/courses/agency` | 代理商 | 代理商后台（学员进度表 + 课程分配） | [`13-courses-agency.png`](screenshots/13-courses-agency.png) |
| 14 | `/profile` | 学员 | 个人资料（XP 进度、徽章、学习路径、技能概览） | [`14-profile.png`](screenshots/14-profile.png) |
| 15 | `/dashboard` | 学员 | 学员仪表盘（继续学习 + 签到日历 + 我的课程） | [`15-dashboard.png`](screenshots/15-dashboard.png) |
| 16 | `/achievements` | 学员 | 成就徽章墙（普通 / 优秀 / 稀有 / 史诗 + 隐藏成就） | [`16-achievements.png`](screenshots/16-achievements.png) |
| 17 | `/learning-path` | 学员 | 学习路径（推荐课程 + 技能树） | [`17-learning-path.png`](screenshots/17-learning-path.png) |
| 18 | `/analytics` | 管理员 | 学习分析（课程表现 + 部门完成热力图 + Top 学员） | [`18-analytics.png`](screenshots/18-analytics.png) |
| 19 | `/daily` | 学员 | 每日任务 / 今日题库 / 段位排行榜（新增 gamification 页） | [`19-daily.png`](screenshots/19-daily.png) |
| 20 | `/sprint` | 学员 | 5 分钟冲刺（Duolingo 风格连续答题 + 倒计时） | [`20-sprint.png`](screenshots/20-sprint.png) |
| 21 | `/crisis` | 学员 | 沉浸式数据中心危机模拟器（实时日志 + 紧急告警） | [`21-crisis.png`](screenshots/21-crisis.png) |
| 22 | `/replay` | 学员 | 专家对比复盘报告（玩家路径 vs 专家路径 + SLA 曲线） | [`22-replay.png`](screenshots/22-replay.png) |
| 23 | `/data-gravity` | 学员 | ZBS 数据分布物理仿真（副本亲和力、节点故障注入、实时能量指标） | [`23-data-gravity.png`](screenshots/23-data-gravity.png) |
| 24 | `/data-gravity/story` | 学员 | ZBS 数据流五场景故事模式（framer-motion 交互叙事） | [`24-data-gravity-story.png`](screenshots/24-data-gravity-story.png) |
| 25 | `/play/scenario_decision/demo?course=smartx-halo` | 学员 | 情景选择关（角色扮演 + Boss 战 HP 条 + 4 选 1 后果叙事） | [`25-play-scenario-decision.png`](screenshots/25-play-scenario-decision.png) |
| 25b | `/play/topology/demo?course=smartx-halo` | 学员 | 拓扑连线关卡（Canvas 渲染 + 知识普及弹窗） — 代表 7 种 UniversalGameRenderer 类型 | [`25b-play-topology.png`](screenshots/25b-play-topology.png) |
| 26 | `/play/sandbox` | 学员 | 交互实验室（物理公式 + 调参面板 + 可视化 + AI 引导 + 学习检验） | [`26-play-sandbox.png`](screenshots/26-play-sandbox.png) |
| 27 | `/level/:id` | 学员 | 关卡答题页（课程切换 + 倒计时 + 标签） | [`27-level.png`](screenshots/27-level.png) |
| 28 | `/results` | 学员 | 结算页（星级 + 基础分 / 时间奖励 / 连击奖励 + XP） | [`28-results.png`](screenshots/28-results.png) |
| 30 | `/admin/dashboard` | 管理员 | 总览看板（课程/关卡/答题/均分 + 活动摘要 + 完成率） | [`30-admin-dashboard.png`](screenshots/30-admin-dashboard.png) |
| 31 | `/admin/courses` | 管理员 | 文档上传 + AI 题目生成（带 AI 模型设置入口） | [`31-admin-courses.png`](screenshots/31-admin-courses.png) |
| 32 | `/admin/review` | 管理员 | AI 题目审核中心（双 Agent 对比 + 置信度） | [`32-admin-review.png`](screenshots/32-admin-review.png) |
| 33 | `/admin/users` | 管理员 | 用户管理（注册审核 + 激活/禁用） | [`33-admin-users.png`](screenshots/33-admin-users.png) |
| 34 | `/admin/partners` | 管理员 | 代理商员工管理（员工概览表 + 课程分配卡片） | [`34-admin-partners.png`](screenshots/34-admin-partners.png) |
| 35 | `/admin/analytics` | 管理员 | 数据看板（KPI + 每日活跃趋势 + 各课程完成情况） | [`35-admin-analytics.png`](screenshots/35-admin-analytics.png) |
| 36 | `/admin/ai-settings` | 管理员 | AI 模型设置（6 provider × 3 用途网格 + API Key 配置 + Provider 状态） | [`36-admin-ai-settings.png`](screenshots/36-admin-ai-settings.png) |
| 37 | `/admin/content-generator` | 管理员 | 内容生成器（内置 ZBS/Ceph/iSCSI 模板 + 自定义 DataFlowTemplate CRUD） | [`37-admin-content-generator.png`](screenshots/37-admin-content-generator.png) |

### 11.2 截图生成流程

```bash
# 1. 安装中文字体（首次运行时）
sudo apt-get install -y fonts-noto-cjk fonts-noto-cjk-extra && fc-cache -fv

# 2. 构建前端（优先使用生产构建以复用编译产物）
cd SkillQuest/apps/web && pnpm build && pnpm start &

# 3. 使用 Playwright MCP 或 chromium headless 依次访问并截图
#    视口: 1280×900; fullPage: true; PNG
#    需要登录的页面：/login 页面上点击"管理员数据看板 / 课程管理"按钮注入演示身份
#
# 4. 拷贝到 SkillQuest/docs/screenshots/ 并以 <序号>-<路由短名>.png 命名
```

### 11.3 未覆盖项

以下场景属于 **动态/交互弹层**，本节暂不单独出图，由 [`ZBS 数据流可视化`](#8-zbs-数据流可视化) 与 [`关卡叙事系统`](#10-关卡叙事系统) 章节的文字描述为主：

- `LevelBriefingModal` 关卡知识普及弹窗（见第 6 节）
- `LevelIntroModal` 叙事入口弹窗（见第 10 节）
- `ComboAnnouncement` / `RankPromotionOverlay` / `BossVictory` 游戏化反馈层（覆盖式出现，无独立路由）

若这些组件未来被提升为独立页面，必须补充对应截图。

---

## 12. 变更日志

> **规则**：每次涉及多文件联动的改动，必须在此追加一条记录。

### 2026-04-21 — 新增「UI 界面截图」章节 (第 11 节)

**背景**：文档之前只记录结构与类型，缺乏对"整个软件长什么样"的可视化索引。新同学、代理商评估者、PM 看需求评审时都无法快速对齐页面外观。本次补齐 33 张端到端 UI 截图并写入 ARCHITECTURE.md，并设置强约束规则防止后续被忽略。

**涉及文件**：

| # | 文件路径 | 改动摘要 |
|---|---|---|
| 1 | `docs/screenshots/01-home.png` … `37-admin-content-generator.png` | **新文件 (33 张)** — 1280×900 `fullPage` PNG，覆盖公共 / 学员 / 代理商 / 管理员四类角色的全部主路由 + 1 个代表性 play 类型 + sandbox + level + results |
| 2 | `docs/ARCHITECTURE.md` | 新增第 11 节「UI 界面截图」(含维护规则、截图索引表、生成流程、未覆盖项清单)；原第 11 节「变更日志」重编号为第 12 节；目录对应更新 |

**生成环境**：

- Node.js / Next.js 15.5.15 生产构建 (`pnpm build && pnpm start`)
- Chromium 147 headless (通过 Playwright 驱动)，视口 1280×900
- 字体：`fonts-noto-cjk` + `fonts-noto-cjk-extra`
- 后端离线，页面在 mock / localStorage 兜底数据下渲染

**维护约束（写入第 11 节开头）**：

1. 路由增删改 → 同步更新截图 + 索引表
2. 视觉重构 → 重新生成受影响截图
3. 禁止删除本节或合并入其他章节
4. PR Review 若发现本节缺失/被简化应直接打回

---

### 2026-04-17 — ZBS 数据流可视化 + 情景选择关 + 关卡叙事系统

**背景**：非技术用户（代理商销售、初级运维）看不懂物理粒子仿真式的数据可视化，游戏关卡只有 MCQ 单一类型缺乏叙事感。本次新增三大系统：五场景故事化 ZBS 教学、情景选择关游戏类型、关卡叙事入口系统。

**涉及文件**：

| # | 文件路径 | 改动摘要 |
|---|---|---|
| 1 | `packages/types/src/index.ts` | 新增 `ZBSScene`, `CHUNK_COLORS`, `ZBSNodeState`, `ZBSFlowVizProps`, `LevelNarrative`, `ScenarioDecisionChoice`, `ScenarioDecisionQuestion`, `GameRendererProps` 类型定义 |
| 2 | `apps/web/src/components/game/ZBSFlowViz.tsx` | **新文件** — ZBS 五场景交互叙事可视化组件（framer-motion 动画，无 Three.js） |
| 3 | `apps/web/src/components/game/ScenarioGameRenderer.tsx` | **新文件** — 情景选择关渲染器（角色扮演 + 4选1 + 后果叙事 + 知识点提炼） |
| 4 | `apps/web/src/components/game/LevelIntroModal.tsx` | **新文件** — 关卡叙事入口弹窗（角色、时间、地点、任务简报） |
| 5 | `apps/web/src/app/data-gravity/story/page.tsx` | **新文件** — ZBS 数据流故事模式页面 |
| 6 | `apps/web/src/app/data-gravity/page.tsx` | 新增故事模式/仿真模式切换器 |
| 7 | `apps/web/src/app/(game)/play/[type]/[id]/page.tsx` | 新增 `scenario_decision` 类型路由分发，使用独立的 `ScenarioGameRenderer` |
| 8 | `apps/web/src/lib/mock-courses/play-content.ts` | 新增 `scenario_decision` Mock 数据（3道 ZBS 守护者任务情景题 + LevelNarrative） |
| 9 | `apps/web/src/lib/mock-courses/briefing-data.ts` | `l2` 互动预习链接改为 `/data-gravity/story`（故事模式） |

**关联组件依赖图**：

```
@skillquest/types
  ├── ZBSScene, CHUNK_COLORS, ZBSFlowVizProps
  │     ↓ 被引用
  │   ZBSFlowViz.tsx (五场景可视化)
  │     ↓ 被引用
  │   data-gravity/story/page.tsx (故事模式页面)
  │     ↑ 模式切换
  │   data-gravity/page.tsx (仿真模式 + 切换器)
  │     ↑ interactiveDemo.href
  │   briefing-data.ts (l2 互动预习链接)
  │
  ├── LevelNarrative
  │     ↓ 被引用
  │   LevelIntroModal.tsx (叙事入口弹窗)
  │     ↓ 被引用
  │   play/[type]/[id]/page.tsx (scenario_decision 路由)
  │
  └── ScenarioDecisionQuestion, ScenarioDecisionChoice
        ↓ 被引用
      ScenarioGameRenderer.tsx (情景选择关渲染器)
        ↓ 被引用
      play/[type]/[id]/page.tsx (scenario_decision 路由)
        ↑ Mock 数据
      play-content.ts (3道情景题 + narrative)
```

**游戏类型扩展**：

原有 7 种：`topology` | `matching` | `ordering` | `quiz` | `terminal` | `scenario` | `vm_placement`

新增 1 种：`scenario_decision`（情景选择关，独立渲染器，不走 UniversalGameRenderer 适配器）

---

### 2026-04-17 — 数据引力场 → ZBS l2 关卡前置互动预习

**背景**：`/data-gravity` 页面原本是独立的 Canvas 物理仿真 Demo，与游戏主线完全脱离。本次将其改造为 ZBS 分布式存储关卡 (l2) 的前置互动预习页面，所有术语改为 ZBS 知识点语义。

**涉及文件**：

| # | 文件路径 | 改动摘要 |
|---|---|---|
| 1 | `packages/types/src/index.ts` | `LevelBriefing` 接口新增可选字段 `interactiveDemo?: { href, label, description }` |
| 2 | `apps/web/src/lib/mock-courses/briefing-data.ts` | `l2` (ZBS 分布式存储) briefing 中添加 `interactiveDemo` 配置，指向 `/data-gravity` |
| 3 | `apps/web/src/components/game/LevelBriefingModal.tsx` | 新增 `FlaskConical` 图标、`Link` import；在小贴士之前渲染互动预习卡片（渐变背景、按钮 `target="_blank"`） |
| 4 | `apps/web/src/app/data-gravity/page.tsx` | 见下表详细改动列表 |

**`data-gravity/page.tsx` 详细改动**：

| 区域 | 原值 | 新值 |
|---|---|---|
| 工具-1 label | `引力锚点` | `副本锚定` |
| 工具-2 label | `能量护盾` | `网络隔离` |
| 工具-3 label | `引力透镜` | `副本检测` |
| 工具-4 label | `奇点引爆` | `节点故障注入` |
| 指标-1 label | `动能 (KE)` | `IO 速率 (读写吞吐)` |
| 指标-2 label | `势能 (PE)` | `节点负载压力` |
| 指标-3 label | `带宽损耗` | `带宽损耗率` |
| 指标-4 label | `熵增` | `数据分布混乱度` |
| 位移量 label | `总位移量` | `数据迁移总量 (MB)` |
| 历史图 label | `熵增历史` | `数据混乱度历史` |
| 滑块-1 label | `G = {value}` | `副本亲和力 G = {value}` |
| 滑块-2 label | `Friction = {value}` | `带宽上限系数 = {value}` |
| 粒子计数 | `粒子:` | `数据块 (16MB chunk):` |
| 节点标题 | `节点状态` | `ZBS 存储节点状态` |
| 节点状态 | `normal` / `failed` / `overloaded` | `正常` / `已故障` / `过载` |
| 重置按钮 | `重置` | `重置模拟` |
| 新增 | — | ZBS 知识背景横幅 (左侧面板) |
| 新增 | — | Canvas 标题条 (绝对定位, pointer-events-none) |
| 新增 | — | `BackToLevelButton` 组件 (Suspense 包裹 useSearchParams) |
| 新增 import | — | `useSearchParams`, `Suspense` |
| 新增常量 | — | `NODE_STATUS_LABELS` lookup table |

**关联组件依赖图**：

```
@skillquest/types (LevelBriefing.interactiveDemo)
    ↓ 被引用
briefing-data.ts (l2 条目配置 interactiveDemo)
    ↓ 数据传入
LevelBriefingModal.tsx (渲染互动预习卡片)
    ↓ Link target="_blank"
/data-gravity (ZBS 数据分布仿真页面)
    ↑ ?from=level&levelId=2
    ↓ BackToLevelButton
/level/{levelId} (返回关卡)
```

---

### 2026-04-20 — Phase 1 用户参与系统 (Boss 战 / 段位 / 连击爆发 / 每日任务)

**背景**：为提升用户粘性和学习动力，对标原神/王者荣耀的参与感设计，新增四大系统：Boss 血条多阶段战斗、7段位竞技系统、连击全屏爆发效果、每日任务卡片。所有功能使用已有的 framer-motion + Canvas 2D + lucide-react，零新依赖。

**涉及文件**：

| # | 文件路径 | 改动摘要 |
|---|---|---|
| 1 | `apps/web/src/components/game/BossHealthBar.tsx` | **新文件** — 多阶段 Boss 血条组件 (Framer Motion 弹簧动画，阶段转换闪屏，浮动伤害数字，低血量脉冲光晕，击败爆炸效果) |
| 2 | `apps/web/src/components/game/RankBadge.tsx` | **新文件** — 7 段位徽章组件 (青铜→传说)，导出 `getRank()` + `RANK_TIERS` 常量 |
| 3 | `apps/web/src/components/game/RankPromotionOverlay.tsx` | **新文件** — 全屏段位晋升动画 (5 阶段序列: 旧徽章 → 粒子爆发 → 新徽章 → 段位名 → 自动关闭)，Web Audio API 升级音效 |
| 4 | `apps/web/src/components/game/ComboAnnouncement.tsx` | **新文件** — 全屏连击公告覆盖层 (good/great/amazing/legendary 四级视觉升级，传奇级含金色粒子爆发 + 屏幕震动) |
| 5 | `apps/web/src/components/game/DailyQuests.tsx` | **新文件** — 每日任务卡片 (localStorage 持久化，4 种任务类型，跨组件 `completeDailyQuest()` API，领取奖励动画) |
| 6 | `apps/web/src/components/game/ScenarioGameRenderer.tsx` | 新增 `bossMode` 属性: Boss 血条集成、伤害系统 (正确=满伤害，错误=30%伤害)、阶段自动分配 |
| 7 | `apps/web/src/app/(game)/play/[type]/[id]/page.tsx` | 集成 `ComboAnnouncement` + `VictoryEffects` 覆盖层，连击追踪状态，`scenario_decision` 启用 Boss 模式 |
| 8 | `apps/web/src/app/daily/page.tsx` | **新文件** — 每日任务演示页面 (`/daily`)，含测试控制台 |

**关联组件依赖图**：

```
BossHealthBar.tsx (Boss 血条)
  ↓ 被引用
ScenarioGameRenderer.tsx (bossMode=true)
  ↓ 被引用
play/[type]/[id]/page.tsx (scenario_decision 路由)

RankBadge.tsx (段位徽章)
  ↓ 导出 RankTier 类型
RankPromotionOverlay.tsx (晋升动画)
  ↓ 被引用
daily/page.tsx (演示页面)

ComboAnnouncement.tsx (连击公告)
  ↓ 被引用
play/[type]/[id]/page.tsx (所有关卡类型)
  ↑ getComboTier()
FeedbackEffects.ts (连击等级计算)

DailyQuests.tsx (每日任务)
  ↓ completeDailyQuest() 全局 API
任意游戏组件 (跨组件触发)
  ↓ 被引用
daily/page.tsx (演示页面 + 测试控制台)
```

**新增路由**：`/daily` — 每日任务演示页面

---

*文档维护规则：后续涉及跨文件联动修改时，请在「变更日志」章节追加记录。*
