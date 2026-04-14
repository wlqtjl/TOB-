# Omni-Sim Platform

> 企业级 IT 基础设施数字孪生仿真平台

**技术栈**: Rust (ECS · Wasm) → Unity 6 LTS (三维可视化) → TypeScript (Web 控制台)

[![CI](https://github.com/your-org/omni-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/omni-sim/actions)

---

## 五步快速上手（新成员，目标 1 小时跑通）

```bash
# Step 1 — 克隆
git clone https://github.com/your-org/omni-sim.git && cd omni-sim

# Step 2 — 验证 Rust 环境（需 stable >= 1.78）
cargo test --workspace
# 期望: test result: ok. XX passed; 0 failed

# Step 3 — 编译 Wasm
./build/build_wasm.sh
# 期望: [OmniSim Build] ✅ Done — unity/Assets/Plugins/Wasm/omni_sim_ffi.wasm (~800KB)

# Step 4 — 用 Unity Hub 打开 unity/ 目录（等待 import，约 2 分钟）

# Step 5 — 点击 Play；Unity Console 应出现：
# [OmniSim] Initialised — 5 entities loaded
# [OmniSim] tick=60 hash[0]=182
```

---

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│ 展示层  Unity Editor / Unity Build / WebGL / CLI        │
├─────────────────────────────────────────────────────────┤
│ 桥接层  OmniSimRuntime.cs ↔ extern "C" FFI ↔ Wasm       │
├─────────────────────────────────────────────────────────┤
│ 核心层  SimulationCore → ECS World (hecs) → Systems      │
│         TelemetrySystem / NetworkSystem / LifecycleSystem│
├─────────────────────────────────────────────────────────┤
│ 数据层  OPDL Compiler → World Snapshot → Blake3 Hash    │
├─────────────────────────────────────────────────────────┤
│ 生态层  SmartX Pack │ VMware Pack │ Huawei Pack │ AWS    │
└─────────────────────────────────────────────────────────┘
```

### Crate 依赖图（无环）

```
omni-sim-opdl          ← 组件类型 + OPDL 编译器（零上游依赖）
    ↑
omni-sim-core          ← ECS 系统 + 状态哈希
    ↑                      ↑
omni-sim-ffi           omni-sim-telemetry
(C ABI / Wasm)         (采样 + WebSocket)
    ↑
omni-sim-headless      ← CLI 无头服务器
```

---

## 环境要求

| 工具 | 版本 | 安装 |
|------|------|------|
| Rust | stable ≥ 1.78 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Unity | 6000.x LTS | unity.com/releases |
| wasm-opt (可选) | latest | `cargo install wasm-opt` |

---

## 构建命令速查

```bash
cargo test --workspace                              # 全套单元 + 集成测试
cargo bench -p omni-sim-core                        # SLA 性能基准
cargo clippy --workspace --deny warnings            # Lint（CI 门控）
cargo fmt --all                                     # 格式化
./build/build_wasm.sh                               # 编译 Wasm → Unity
./build/build_all.sh                                # fmt+clippy+test+wasm

# Headless 批量仿真
cargo run -p omni-sim-headless -- \
  --opdl vendor/smartx/smartx.opdl.json \
  --ticks 1000
```

---

## 厂商 Pack 开发

1. 在 `vendor/<name>/` 下创建目录
2. 按 [OPDL v1.0 规范](docs/opdl-spec.md) 编写 `*.opdl.json`
3. `cargo run -p omni-sim-headless -- --opdl vendor/<name>/xxx.opdl.json --ticks 10` 验证
4. 在 `unity/StreamingAssets/Packs/` 注册文件
5. 提 PR — CI 自动验证

---

## 性能 SLA

| 指标 | MVP (Phase 1) | 生产 (Phase 3) |
|------|---------------|----------------|
| tick (1k 实体) | < 0.5ms | < 0.1ms |
| tick (100k 实体) | < 10ms | < 2ms |
| 渲染帧率 (100k) | 30fps | 60fps |
| Wasm 文件大小 | < 5MB | < 2MB |
| State Hash 计算 | < 5ms | < 1ms |

---

## 开发缺陷修复记录

原始草案存在 8 个根本性缺陷，本版本全部修复：

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| D-01 | `static mut` UB | `thread_local! + RefCell` |
| D-02 | FFI 返回 `Vec` 导致内存违例 | caller-supplied output buffer |
| D-03 | `wasm-bindgen` 与 Unity ABI 不兼容 | 纯 `extern "C"` cdylib |
| D-04 | `HashMap<Entity>` 缓存不命中 | hecs Archetype 连续存储 |
| D-05 | OPDL 无 schema 验证，`.unwrap()` panic | OPDL 编译器三阶段流水线 |
| D-06 | Telemetry 无传输无历史 | WebSocket 推送 + 3600 帧环形缓冲 |
| D-07 | `TelemetryRenderer.cs` 为空 | 完整 GPU Instancing，1023/batch |
| D-08 | 零测试 | 单元 + 集成 + 属性 + 压测全覆盖 |

---

## License

Proprietary — Omni-Sim Platform © 2026
