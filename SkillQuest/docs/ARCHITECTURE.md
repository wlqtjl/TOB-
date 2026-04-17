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
8. [变更日志](#8-变更日志)

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
│   │   │   ├── dashboard/            # 📊 学员仪表盘
│   │   │   ├── admin/                # ⚙️ 管理后台
│   │   │   ├── login/                # 🔐 登录
│   │   │   ├── register/             # 📝 注册
│   │   │   ├── showcase/             # 🎨 产品介绍
│   │   │   └── ...
│   │   ├── src/components/
│   │   │   ├── game/                 # 游戏相关组件
│   │   │   │   ├── LevelBriefingModal.tsx   # 关卡前知识普及弹窗
│   │   │   │   └── UniversalGameRenderer.tsx
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

### TRAINER 端
| 路由 | 文件 | 说明 |
|---|---|---|
| `/courses/agency` | `app/courses/agency/page.tsx` | 代理商课程管理 |

### 特殊页面
| 路由 | 文件 | 说明 |
|---|---|---|
| `/data-gravity` | `app/data-gravity/page.tsx` | **ZBS 数据分布仿真**（Canvas 物理引擎，关卡 l2 前置互动预习）|

---

## 4. 共享类型系统

文件: `packages/types/src/index.ts`

### 核心类型

| 类型 | 用途 |
|---|---|
| `LevelType` | 关卡题型枚举：`choice`、`topology`、`terminal`、`scenario`、`flow_sim`、`sandbox` |
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

## 8. 变更日志

> **规则**：每次涉及多文件联动的改动，必须在此追加一条记录。

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

*文档维护规则：后续涉及跨文件联动修改时，请在「变更日志」章节追加记录。*
