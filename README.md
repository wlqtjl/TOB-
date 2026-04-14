# TOB- — To-B 企业级产品培训与仿真平台

> 包含两大子系统：**SkillQuest**（游戏化培训）+ **Omni-Sim**（数字孪生仿真）

---

## 子项目

| 子项目 | 说明 | 详细文档 |
|--------|------|----------|
| [SkillQuest](SkillQuest/) | 游戏化产品技能培训平台（Next.js 15 + NestJS + AI） | [SkillQuest README](SkillQuest/README.md) |
| [Omni-Sim](omni-sim/) | 企业级 IT 基础设施数字孪生仿真平台（Rust ECS + Unity + TypeScript） | [Omni-Sim README](omni-sim/README.md) |

---

## 页面截图

👉 [查看 SkillQuest 全部 9 页截图](docs/screenshots.md)

| 首页 | 数据引力场 | 课程管理 |
|:---:|:---:|:---:|
| [![首页](docs/screenshots/01-homepage.png)](docs/screenshots.md#1-首页含数据引力场入口) | [![数据引力场](docs/screenshots/02-data-gravity.png)](docs/screenshots.md#2-数据引力场--物理可视化新增功能) | [![课程管理](docs/screenshots/03-course-admin.png)](docs/screenshots.md#3-课程管理后台) |

| 闯关地图 | 排行榜 | 关卡知识普及 |
|:---:|:---:|:---:|
| [![闯关地图](docs/screenshots/04-level-map.png)](docs/screenshots.md#4-闯关地图) | [![排行榜](docs/screenshots/05-leaderboard.png)](docs/screenshots.md#5-排行榜) | [![知识普及](docs/screenshots/06-level-briefing.png)](docs/screenshots.md#6-关卡知识普及level-briefing) |

| 拓扑连线 | 专家复盘 | 产品介绍 |
|:---:|:---:|:---:|
| [![拓扑连线](docs/screenshots/07-topology-level.png)](docs/screenshots.md#7-拓扑连线关卡含知识普及) | [![专家复盘](docs/screenshots/08-expert-replay.png)](docs/screenshots.md#8-专家对比复盘报告) | [![产品介绍](docs/screenshots/09-showcase.png)](docs/screenshots.md#9-产品介绍七大核心能力) |

---

## 技术架构概览

### SkillQuest 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 15 (App Router) | SSR + 路由 |
| 游戏引擎 | Canvas 2D + 自研粒子引擎 | 8 种关卡渲染 + Combo 连击 |
| UI 设计 | Tailwind CSS + Lucide React | 极简毛玻璃设计系统 |
| 后端框架 | NestJS 10 | REST API + WebSocket |
| 数据库 | PostgreSQL 16 + Prisma ORM | 业务数据 + 向量存储 |
| 缓存/排行 | Redis 7 | Sorted Set 排行榜 |
| AI 引擎 | FastAPI + GPT-4o + MinerU 2.5 | RAG 检索 + 题目生成 |
| 构建工具 | Turborepo + pnpm | Monorepo 管理 |

### Omni-Sim 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 核心引擎 | Rust (hecs ECS) | 仿真状态机 + 确定性哈希 |
| 编译目标 | Wasm (wasm32-unknown-unknown) | 跨平台部署 |
| 数据格式 | OPDL 编译器 | 厂商设备描述语言 |
| 三维展示 | Unity 6 LTS | GPU Instancing 渲染 |
| Web 控制台 | TypeScript + Vite | 实时 Telemetry 面板 |
| 部署 | Docker Compose + Nginx | WebSocket + 静态文件 |

---

## 快速开始

### SkillQuest（最快体验 — 仅前端）

```bash
cd SkillQuest
npm install -g pnpm@9.1.0
pnpm install
pnpm --filter @skillquest/web dev
# → 打开 http://localhost:3000 即可闯关（内置 Mock 数据，无需后端）
```

### Omni-Sim

```bash
cd omni-sim
cargo test --workspace       # 运行全部测试
./build/build_wasm.sh        # 编译 Wasm → Unity
```

详细说明请参阅各子项目 README。

---

## 完整 PR 变更记录（#1 — #22）

> 以下是本仓库从创建至今全部已合并 PR 的完整记录，按时间顺序排列。

### Phase 0：Omni-Sim 基础建设（PR #1 — #4）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#1](https://github.com/wlqtjl/TOB-/pull/1) | 2026-04-09 | Extract 游戏攻关2.0.tar.gz into repository | 解压 `omni-sim/` 项目：Rust workspace（5 个 crate: core/ffi/headless/opdl/telemetry）、Unity 集成脚本、CI 工作流、厂商 Pack、42 个新文件 |
| [#2](https://github.com/wlqtjl/TOB-/pull/2) | 2026-04-09 | fix: production-readiness defects (C-01–C-04, H-01–H-07, M/L tier) | 修复 20 个生产级缺陷：状态哈希确定性(C-01)、FFI 内存安全(C-02)、OPDL 编译器三阶段流水线(C-03)、Telemetry WebSocket 推送(C-04)、运行时稳定性(H-01–H-07) |
| [#3](https://github.com/wlqtjl/TOB-/pull/3) | 2026-04-09 | Add comprehensive test coverage across all crates (46 → 139 tests) | 测试覆盖从 46 增至 139：补全 omni-sim-ffi 和 omni-sim-headless 的零测试缺口、覆盖 validator 全部 12 种错误变体 |
| [#4](https://github.com/wlqtjl/TOB-/pull/4) | 2026-04-10 | feat: add --serve mode for live WebSocket telemetry deployment | 新增 `--serve` 模式：Rust ECS 仿真 → WebSocket 遥测 → TypeScript Web Console 仪表板全链路部署；Docker Compose 支持 |

### Phase 1：SkillQuest 安全与渲染引擎（PR #5 — #8）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#5](https://github.com/wlqtjl/TOB-/pull/5) | 2026-04-11 | fix(security): upgrade next 14.2.35 → 15.x to patch HTTP request deserialization DoS | 修复 Next.js HTTP 请求反序列化 DoS 漏洞（CVE 影响 ≥13.0.0, <15.0.8）；升级到 Next.js 15 稳定版 |
| [#6](https://github.com/wlqtjl/TOB-/pull/6) | 2026-04-11 | feat: VisualScene protocol — universal Canvas rendering engine | 统一 Canvas 2D 渲染引擎替代逐类型 SVG 渲染；VisualScene 协议支持 8 种关卡类型的通用渲染管线 |
| [#7](https://github.com/wlqtjl/TOB-/pull/7) | 2026-04-11 | Resolving architectural gaps in game engine's visual layer | 修复游戏引擎可视化层架构缺口 |
| [#8](https://github.com/wlqtjl/TOB-/pull/8) | 2026-04-11 | Fix 9 architectural defects in game engine visual layer | 修复 9 个架构缺陷：ScoreResult.stars 类型安全、内存泄漏、硬编码假设等 |

### Phase 2：AI 出题 + 流程仿真（PR #9 — #11）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#9](https://github.com/wlqtjl/TOB-/pull/9) | 2026-04-11 | feat: document upload → GPT-4o AI course generation pipeline | 激活文档上传 → AI 课程生成流水线：PDF/DOCX/TXT 上传 → MinerU 智能解析 → GPT-4o 自动生成 7 种题型关卡 |
| [#10](https://github.com/wlqtjl/TOB-/pull/10) | 2026-04-12 | feat: FLOW_SIM level type — doc-to-playable-game pipeline (3-phase) | 新增 FLOW_SIM 关卡类型：将不可见的系统内部流程（如 ZBS 分布式块存储元数据管理）转化为可视化交互游戏关卡 |
| [#11](https://github.com/wlqtjl/TOB-/pull/11) | 2026-04-12 | Fix TS lint errors and migrate web from deprecated next lint to ESLint CLI | 修复 API 8 个 TypeScript 编译错误；迁移 Web 从废弃的 `next lint` 到 ESLint CLI |

### Phase 3：展示与品牌设计（PR #12 — #14）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#12](https://github.com/wlqtjl/TOB-/pull/12) | 2026-04-12 | Add standalone HTML showcase with animations and synthesized audio | 创建独立 HTML 展示页（`showcase.html`）：动画 + 合成音频，可离线打开，无需运行开发服务器 |
| [#13](https://github.com/wlqtjl/TOB-/pull/13) | 2026-04-12 | Add PDF brochure for sharing SkillQuest showcase with SmartX leadership | 创建 PDF 手册（`SkillQuest-介绍手册.pdf`）：供微信/钉钉分享给 SmartX 管理层，避免 HTML 附件被邮件过滤 |
| [#14](https://github.com/wlqtjl/TOB-/pull/14) | 2026-04-12 | Minimalist UI redesign: Lucide icons, single-accent color system, frosted glass | 全站 UI 重构：从 emoji 多渐变风格 → 极简/科技冷感设计（对标 Linear.app + Apple）；Lucide 图标、单色调、毛玻璃效果 |

### Phase 4：AI 校验 + 游戏引擎深度功能（PR #15 — #19）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#15](https://github.com/wlqtjl/TOB-/pull/15) | 2026-04-12 | RAG question engine, multi-agent validation, WorldState sandbox, universal animation catalog | RAG 管道（chunker→embedder→retriever）、生成器-求解器双代理校验、WorldState 沙箱（纯函数）、19 种通用动画映射、数据库审核字段（reviewStatus/feedbackLog） |
| [#16](https://github.com/wlqtjl/TOB-/pull/16) | 2026-04-12 | RAG BM25 fallback, configurable Solver model, deterministic executeActionPure, path-based detectChanges | BM25 文本检索备用方案（替代零向量降级）、Agent B 模型可配置、executeActionPure 支持确定性 PRNG（Mulberry32 种子）、detectChanges 路径索引优化（O(n²)→O(1)） |
| [#17](https://github.com/wlqtjl/TOB-/pull/17) | 2026-04-12 | feat: Expert Comparison Timeline — vertical dual-track deviation map | 专家对比复盘视图：垂直双轨时间线、SLA 下降曲线、玩家路径 vs 专家最优路径对比、偏离点标注 |
| [#18](https://github.com/wlqtjl/TOB-/pull/18) | 2026-04-12 | feat: ToolSystem, PhysicsEngine, ToolVisualBridge — hardcore simulation interaction | 硬核仿真交互系统：6 种语义工具（Probe/Cutter/Booster/Linker/Migrator/Freezer）、粒子物理引擎、工具→动画桥接、ZBS 副本救援场景 |
| [#19](https://github.com/wlqtjl/TOB-/pull/19) | 2026-04-12 | feat: Data Gravity 2D physics interaction system | 数据引力物理系统：CorePhysicsEngine（F=GMm/r²）、NodeManager（质量=100×容量×带宽）、GravityGunController（4 种工具）、EnergyMonitor（动能/势能/熵增）；98 个测试 |

### Phase 5：知识普及 + 前端补全 + 截图修复（PR #20 — #22）

| PR | 日期 | 标题 | 关键变更 |
|----|------|------|----------|
| [#20](https://github.com/wlqtjl/TOB-/pull/20) | 2026-04-13 | feat: add pre-game level briefing system (关卡前知识普及) | 关卡前知识普及模态框（LevelBriefingModal）：知识点展开、通关目标、小贴士；修复 levelId 格式不匹配（URL 用 '1'，数据用 'l1'） |
| [#21](https://github.com/wlqtjl/TOB-/pull/21) | 2026-04-13 | feat: add DataGravity physics visualization page | 7 大功能模块完整性验证（43+ 文件）；268 个游戏引擎测试通过；DataGravity Canvas 2D 可视化前端页面（/data-gravity）；首页导航 + Showcase 更新为「七大核心能力」；遗漏模式分析 |
| [#22](https://github.com/wlqtjl/TOB-/pull/22) | 2026-04-13 | fix: 修复截图不可点击问题 — 第一性原理根治 | 根因：`user-attachments/assets/` URL 重定向到 5 分钟过期 S3 签名 URL；修复：截图存入 `docs/screenshots/` 永久资产 + `[![alt](path)](path)` 可点击语法；更新 README 缩略图网格 |

---

## 功能模块完整清单

### SkillQuest — 7 大功能模块

| 模块 | 核心文件 | PR | 测试数 |
|------|----------|-----|--------|
| 硬核仿真交互系统 | tool-system.ts, physics-engine.ts, tool-visual-bridge.ts, zbs-replica-rescue.ts | [#18](https://github.com/wlqtjl/TOB-/pull/18) | 69 |
| 数据引力物理系统 | data-gravity/core-physics-engine.ts, node-manager.ts, gravity-gun-controller.ts, energy-monitor.ts, vec2.ts | [#19](https://github.com/wlqtjl/TOB-/pull/19) [#21](https://github.com/wlqtjl/TOB-/pull/21) | 98 |
| AI 出题校验 + RAG 管道 | rag/chunker.py, embedder.py, bm25.py, retriever.py, question-validator.service.ts | [#9](https://github.com/wlqtjl/TOB-/pull/9) [#15](https://github.com/wlqtjl/TOB-/pull/15) [#16](https://github.com/wlqtjl/TOB-/pull/16) | 49 (Python) |
| 数据库审核/反馈字段 | schema.prisma (Level.reviewStatus, DocumentChunk, QuestionValidationLog, IncidentReport) | [#15](https://github.com/wlqtjl/TOB-/pull/15) | — |
| Canvas 动画通用化 | animation-catalog.ts (19 种动画), world-state.ts, world-state-visual-bridge.ts | [#6](https://github.com/wlqtjl/TOB-/pull/6) [#15](https://github.com/wlqtjl/TOB-/pull/15) | 79 |
| 关卡前知识普及 | LevelBriefingModal.tsx, briefing-data.ts | [#20](https://github.com/wlqtjl/TOB-/pull/20) | — |
| 专家对比复盘 | ExpertComparisonTimeline.tsx, SLACurve.tsx, TimelineNode.tsx, replay/page.tsx | [#17](https://github.com/wlqtjl/TOB-/pull/17) | — |

### SkillQuest — 8 种关卡类型

| 类型 | 说明 | 首次引入 |
|------|------|----------|
| 拓扑连线 (topology) | 拖拽构建网络拓扑图 | 初始版本 |
| 知识配对 (matching) | 组件功能一对一匹配 | 初始版本 |
| 步骤排序 (ordering) | 操作流程正确排序 | 初始版本 |
| 选择题 (quiz) | 知识点快速测验 | 初始版本 |
| 命令行 (terminal) | 真实 CLI 命令模拟 | 初始版本 |
| 故障排查 (scenario) | 场景化排障实战 | 初始版本 |
| VM 调度 (vm_placement) | 虚拟机智能放置 | 初始版本 |
| 流程仿真 (flow_sim) | 分布式系统流程模拟 | [#10](https://github.com/wlqtjl/TOB-/pull/10) |

### Omni-Sim — 5 个 Rust Crate

| Crate | 说明 | PR |
|-------|------|----|
| omni-sim-opdl | 组件类型 + OPDL 编译器（零上游依赖） | [#1](https://github.com/wlqtjl/TOB-/pull/1) [#2](https://github.com/wlqtjl/TOB-/pull/2) |
| omni-sim-core | ECS 系统 + 状态哈希 | [#1](https://github.com/wlqtjl/TOB-/pull/1) [#2](https://github.com/wlqtjl/TOB-/pull/2) |
| omni-sim-ffi | C ABI / Wasm FFI 层 | [#1](https://github.com/wlqtjl/TOB-/pull/1) [#3](https://github.com/wlqtjl/TOB-/pull/3) |
| omni-sim-telemetry | 采样 + WebSocket 推送 | [#1](https://github.com/wlqtjl/TOB-/pull/1) [#2](https://github.com/wlqtjl/TOB-/pull/2) |
| omni-sim-headless | CLI 无头服务器 + `--serve` 模式 | [#1](https://github.com/wlqtjl/TOB-/pull/1) [#3](https://github.com/wlqtjl/TOB-/pull/3) [#4](https://github.com/wlqtjl/TOB-/pull/4) |

---

## 测试覆盖

| 子系统 | 框架 | 测试数 | 运行命令 |
|--------|------|--------|----------|
| Omni-Sim (Rust) | cargo test | 139 | `cd omni-sim && cargo test --workspace` |
| SkillQuest 游戏引擎 (TS) | Vitest | 268 | `cd SkillQuest/packages/game-engine && npx vitest run` |
| SkillQuest AI 引擎 (Python) | pytest | ~155 | `cd SkillQuest/services/ai-engine && python3 -m pytest tests/ -v` |
| Omni-Sim Web Console (TS) | Vitest | 23 | `cd omni-sim/web-console && npm test` |

---

## 安全修复记录

| PR | 问题 | 修复 |
|----|------|------|
| [#2](https://github.com/wlqtjl/TOB-/pull/2) | Omni-Sim: `static mut` UB、FFI 内存违例、`.unwrap()` panic | `thread_local! + RefCell`、caller-supplied buffer、OPDL 三阶段编译器 |
| [#5](https://github.com/wlqtjl/TOB-/pull/5) | Next.js HTTP 请求反序列化 DoS (CVE, 影响 ≥13.0.0) | 升级 Next.js 14.2.35 → 15.x |
| [#8](https://github.com/wlqtjl/TOB-/pull/8) | 游戏引擎可视化层类型安全缺陷 + 内存泄漏 | 类型修复 + 资源清理 |

---

## 设计系统

| 原则 | 实现 | PR |
|------|------|----|
| 零 emoji | 全部使用 Lucide-React 图标 | [#14](https://github.com/wlqtjl/TOB-/pull/14) |
| 单色调 | 蓝紫主色 + 毛玻璃效果 | [#14](https://github.com/wlqtjl/TOB-/pull/14) |
| 截图可点击 | PNG 存 `docs/screenshots/` + `[![](path)](path)` 语法 | [#22](https://github.com/wlqtjl/TOB-/pull/22) |

---

## 项目文件结构

```
TOB-/
├── README.md                          ← 本文件（全部 PR 变更记录）
├── SkillQuest/                        ← 游戏化培训平台
│   ├── apps/web/                      # Next.js 15 前端（9 个页面）
│   ├── apps/api/                      # NestJS 后端 API
│   ├── packages/game-engine/          # 游戏引擎（268 个测试）
│   ├── packages/types/                # 共享 TypeScript 类型
│   ├── services/ai-engine/            # Python FastAPI AI 引擎
│   ├── infra/                         # Docker + Nginx
│   ├── showcase.html                  # 独立展示页（PR #12）
│   └── SkillQuest-介绍手册.pdf        # PDF 手册（PR #13）
├── omni-sim/                          ← 数字孪生仿真平台
│   ├── crates/                        # 5 个 Rust crate
│   ├── unity/                         # Unity 集成
│   ├── web-console/                   # TypeScript 遥测面板
│   ├── vendor/                        # 厂商 Pack（SmartX 等）
│   └── build/                         # 构建脚本
├── docs/
│   ├── screenshots/                   # 9 张页面截图（PNG）
│   └── screenshots.md                 # 截图文档页
├── game20_extracted/                  # 提取的游戏资产
└── 游戏攻关2.0.tar.gz                 # 原始归档
```

---

## License

Proprietary — © 2026