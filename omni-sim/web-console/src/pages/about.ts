/**
 * About page — platform information and version details.
 */

export function renderAboutPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-header">
      <h2>About Omni-Sim Platform</h2>
    </div>

    <!-- Version Info -->
    <section class="detail-section">
      <h2>Version Information</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">Platform</span>
          <span class="prop-value">Omni-Sim</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Version</span>
          <span class="prop-value mono">0.1.0</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Web Console</span>
          <span class="prop-value mono">0.1.0 (TypeScript + Vite)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Simulation Engine</span>
          <span class="prop-value mono">Rust 1.78 (hecs ECS)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Telemetry Protocol</span>
          <span class="prop-value mono">WebSocket JSON §5.2</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">State Hash Algorithm</span>
          <span class="prop-value mono">Blake3</span>
        </div>
      </div>
    </section>

    <!-- Architecture Diagram -->
    <section class="detail-section">
      <h2>Architecture</h2>
      <div class="code-block architecture-diagram">
        <code>┌─────────────────────────────────────────────────────────┐
│ 展示层  Unity Editor / WebGL / CLI / Web Console (TS)    │
├─────────────────────────────────────────────────────────┤
│ 桥接层  OmniSimRuntime.cs ↔ FFI ↔ Wasm │ WebSocket     │
├─────────────────────────────────────────────────────────┤
│ 核心层  SimulationCore → ECS World (hecs) → Systems      │
│         TelemetrySystem / NetworkSystem / LifecycleSystem│
├─────────────────────────────────────────────────────────┤
│ 数据层  OPDL Compiler → World Snapshot → Blake3 Hash    │
├─────────────────────────────────────────────────────────┤
│ 生态层  SmartX Pack │ VMware Pack │ Huawei Pack │ AWS    │
├─────────────────────────────────────────────────────────┤
│ 运维层  Docker Compose │ deploy/setup.sh │ CI/CD         │
└─────────────────────────────────────────────────────────┘</code>
      </div>
    </section>

    <!-- Crate Dependency Graph -->
    <section class="detail-section">
      <h2>Crate Dependency Graph</h2>
      <div class="code-block">
        <code>omni-sim-opdl          ← Component types + OPDL compiler (zero upstream deps)
    ↑
omni-sim-core          ← ECS systems + state hashing
    ↑                      ↑
omni-sim-ffi           omni-sim-telemetry
(C ABI / Wasm)         (Sampling + WebSocket)
    ↑
omni-sim-headless      ← CLI headless server</code>
      </div>
    </section>

    <!-- Technology Stack -->
    <section class="detail-section">
      <h2>Technology Stack</h2>
      <div class="tech-grid">
        <div class="tech-card">
          <span class="tech-icon">🦀</span>
          <span class="tech-name">Rust</span>
          <span class="tech-desc">Core simulation engine, ECS, OPDL compiler</span>
        </div>
        <div class="tech-card">
          <span class="tech-icon">🎮</span>
          <span class="tech-name">Unity 6 LTS</span>
          <span class="tech-desc">3D visualization, GPU instancing</span>
        </div>
        <div class="tech-card">
          <span class="tech-icon">📝</span>
          <span class="tech-name">TypeScript</span>
          <span class="tech-desc">Web Console, real-time dashboard</span>
        </div>
        <div class="tech-card">
          <span class="tech-icon">🕸️</span>
          <span class="tech-name">WebAssembly</span>
          <span class="tech-desc">Rust → Wasm bridge for Unity</span>
        </div>
        <div class="tech-card">
          <span class="tech-icon">📡</span>
          <span class="tech-name">WebSocket</span>
          <span class="tech-desc">Real-time telemetry push</span>
        </div>
        <div class="tech-card">
          <span class="tech-icon">🐳</span>
          <span class="tech-name">Docker</span>
          <span class="tech-desc">Containerized deployment</span>
        </div>
      </div>
    </section>

    <!-- Performance SLA -->
    <section class="detail-section">
      <h2>Performance SLA</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>MVP (Phase 1)</th>
            <th>Production (Phase 3)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>tick (1k entities)</td>
            <td>< 0.5ms</td>
            <td>< 0.1ms</td>
          </tr>
          <tr>
            <td>tick (100k entities)</td>
            <td>< 10ms</td>
            <td>< 2ms</td>
          </tr>
          <tr>
            <td>Render FPS (100k)</td>
            <td>30fps</td>
            <td>60fps</td>
          </tr>
          <tr>
            <td>Wasm file size</td>
            <td>< 5MB</td>
            <td>< 2MB</td>
          </tr>
          <tr>
            <td>State Hash</td>
            <td>< 5ms</td>
            <td>< 1ms</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- License -->
    <section class="detail-section">
      <h2>License</h2>
      <p class="license-text">
        Proprietary — Omni-Sim Platform © 2026. All rights reserved.
      </p>
    </section>
  `;
}
