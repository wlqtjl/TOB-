# SkillQuest — 游戏化产品技能培训平台

> **对标 [Data Center](https://store.steampowered.com/) 游戏级炫酷效果**，将华为/锐捷/SmartX/华三等 To-B 产品培训变成闯关游戏。

## 🎮 核心理念

Data Center 游戏将**网络流量**变成了**可以眼见的彩色数据包球**（packet-balls），SkillQuest 用同样的设计哲学，将**产品知识**变成**可以闯关的游戏体验**：

| Data Center 游戏 | SkillQuest 对应 |
|---|---|
| 🔵 彩色数据包球 = 网络流量可视化 | ✨ 知识粒子流 = 学习进度可视化 |
| 📋 客户需求 = 关卡目标 | 📋 产品考核 = 通关条件 |
| ⬆️ XP 解锁新硬件 | ⬆️ XP 解锁新课程/徽章/证书 |
| 🔧 硬件老化 = 重复学习 | 🧠 知识遗忘曲线 = 定期复习 |
| ⚡ 即时包球反馈 | ⚡ 即时答题动画+音效反馈 |
| 🔗 连线建立网络 | 🔗 连线配对知识关联 |

## 📁 项目架构

```
SkillQuest/
├── apps/
│   ├── web/                     # Next.js 15 (App Router) — 前端
│   │   ├── (game)/              # 游戏端 (员工闯关)
│   │   │   ├── map/             # 🗺️ 闯关地图 (Phaser.js 粒子流)
│   │   │   ├── level/[id]/      # 📝 关卡答题 (爆炸粒子+连击)
│   │   │   └── leaderboard/     # 🏆 实时排行榜 (WebSocket)
│   │   ├── (admin)/             # ⚙️ 厂商管理后台
│   │   └── (dashboard)/         # 📊 数据分析看板
│   │
│   └── api/                     # NestJS 后端
│       ├── auth/                # JWT + 企业SSO
│       ├── tenant/              # 多租户隔离
│       ├── course/              # 课程管理
│       ├── game-engine/         # 游戏状态机 + 评分 + 拓扑验证
│       ├── leaderboard/         # Redis 排行榜
│       └── analytics/           # 学习数据分析
│
├── packages/
│   ├── types/                   # 共享 TypeScript 类型定义
│   └── game-engine/             # 游戏引擎核心逻辑
│       ├── level-state-machine  # 关卡 DAG 状态机
│       ├── scoring-engine       # XP + combo + star 三维度评分
│       ├── topology-engine      # BFS 拓扑连线验证 (对标 packet-balls)
│       └── combo-tracker        # 连击追踪 (游戏感核心)
│
├── services/
│   └── ai-engine/               # Python FastAPI — AI 能力
│       ├── parsers/             # PDF/PPT 解析
│       └── generators/          # LLM 题目生成 + GPT-4o 拓扑识别
│
└── infra/
    ├── docker-compose.yml       # PostgreSQL + Redis + API + Web + AI
    ├── nginx/                   # 反向代理
    └── Dockerfile.*             # 各服务容器
```

## 🎯 六大关卡题型

### ★★★★★ 交互拓扑连线题 (对标 Data Center packet-balls)
> **最炫效果** — 网络拓扑图天然适合可视化

- 拖拽连线 PC/路由器/交换机/服务器
- 答对后**彩色数据包球**沿路径流动 (Bezier 曲线粒子)
- 技术: Cytoscape.js + PixiJS Particles

### ★★★★ VRP 终端命令填空
> **To-B 独有题型** — 模拟华为 VRP 命令行

- 黑色终端背景 + 绿色等宽字体
- 答对后命令逐字打印动画
- 配置生效后设备图标变绿 + 连通性粒子特效

### ★★★★ 故障排查情景剧本
> **叙事性最强** — OSPF/STP 故障排查

- 客户电话场景 → 选择排查工具 → 查看输出
- 正确路径: 经验值爆炸 / 错误路径: 震动反馈

### ★★★ 虚拟化/超融合关卡 (SmartX ZBS)
> **揭秘不可见的过程** — 把内部机制变成游戏

- VM 拖拽放置 → 资源条实时变化
- 多副本写入动画 → 数据包球流向多节点
- 节点故障触发 → VM 高可用迁移动画

### ★★ 基础选择题 / 排序题 / 连线配对

## 🛠️ 技术栈

| 层级 | 技术 | 用途 |
|---|---|---|
| 前端框架 | Next.js 15 (App Router) | SSR + 路由 |
| 游戏引擎 | Phaser.js 3 / PixiJS | 粒子流 + 交互动画 |
| 图可视化 | Cytoscape.js | 拓扑图渲染 |
| UI 样式 | Tailwind CSS | 响应式布局 |
| 后端框架 | NestJS 10 | REST API + WebSocket |
| 实时通信 | Socket.io | 排行榜推送 |
| 数据库 | PostgreSQL 16 | 业务数据 |
| 缓存/排行 | Redis 7 | Sorted Set 排行榜 |
| AI 引擎 | FastAPI + GPT-4o | 题目生成 + 拓扑识别 |
| 构建工具 | Turborepo + pnpm | Monorepo 管理 |
| 容器化 | Docker Compose | 本地开发 + 部署 |

## 🚀 快速开始

```bash
# 1. 安装依赖
cd SkillQuest
pnpm install

# 2. 启动 Docker 基础设施 (PostgreSQL + Redis)
cd infra && docker compose up -d postgres redis

# 3. 初始化数据库 (Prisma 迁移 + 填充演示数据)
cd ../apps/api
cp ../../.env.example .env          # 创建环境变量文件
npx prisma migrate deploy           # 运行数据库迁移
npx ts-node prisma/seed.ts          # 填充演示数据 (3门课程/24个关卡/排行榜)

# 4. 启动开发服务器
cd ../..
pnpm dev                  # 全部服务
pnpm --filter @skillquest/web dev    # 仅前端 (含Mock数据，无需后端)
pnpm --filter @skillquest/api dev    # 仅后端 API

# 5. 打开浏览器
# → 前端: http://localhost:3000
# → API:  http://localhost:3001/api

# 📧 演示登录: demo@skillquest.dev / password
```

### ⚡ 最快体验 — 仅前端游戏模式

> 不需要数据库和后端，直接用内置 Mock 数据开始游戏！

```bash
cd SkillQuest
pnpm install
pnpm --filter @skillquest/web dev
# → 打开 http://localhost:3000 即可闯关
```

### 🐳 一键 Docker 全栈部署

```bash
cd SkillQuest/infra
docker compose up --build
# → 前端: http://localhost:3000
# → API:  http://localhost:3001/api
# → AI:   http://localhost:8000
```

### 🗄️ 数据库管理

```bash
cd apps/api
npx prisma studio            # 可视化数据库管理面板 (http://localhost:5555)
npx prisma migrate dev        # 创建新迁移
npx prisma migrate reset      # 重置数据库 (删除所有数据)
```

### 📡 API 端点速查

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 → JWT Token |
| GET | `/api/auth/me` | 当前用户 (需 Bearer Token) |
| GET | `/api/courses` | 课程列表 |
| GET | `/api/courses/:id` | 课程详情 + 关卡 |
| GET | `/api/courses/:id/map` | 闯关地图数据 |
| GET | `/api/courses/:id/levels` | 关卡列表 |
| GET | `/api/courses/:id/questions` | 题目数据 |
| GET | `/api/courses/:id/play/:type` | 游戏内容 (按题型) |
| POST | `/api/game/level/:cid/:lid/start` | 开始关卡 |
| POST | `/api/game/level/:cid/:lid/submit` | 提交答题结果 |
| GET | `/api/leaderboard/:courseId` | 排行榜 |
| GET | `/api/tenants` | 租户列表 |
| POST | `/api/analytics/events` | 记录分析事件 |
| GET | `/api/analytics/users/:id` | 用户学习概览 |

> AI 引擎 (可选): 需要 `OPENAI_API_KEY`，不影响游戏闯关功能。

## 📅 执行路线图

| Phase | 时间 | 内容 |
|---|---|---|
| **Phase 0** | 第1-2周 | ✅ Monorepo搭建 + Docker + CI |
| **Phase 0.5** | 第2-3周 | ✅ Prisma数据库 + API业务逻辑 + JWT认证 + 数据Seed + 排行榜 |
| **Phase 1** | 第3-8周 | 闯关地图 + 基础题型 + 排行榜 + 连击系统 |
| **Phase 2** | 第9-14周 | AI题目生成 + 拓扑识别 + 高级题型 |
| **Phase 3** | 第15-20周 | 成就/徽章 + 每日挑战 + 数字证书 |
| **Phase 4** | 第21-28周 | 钉钉/飞书SSO + 团队管理 + PWA |
