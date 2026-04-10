/**
 * Simulation Control page — start/stop/configure simulation parameters.
 */

export function renderSimulationPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-header">
      <h2>Simulation Control</h2>
    </div>

    <!-- Simulation Status -->
    <section class="status-panel">
      <div class="status-indicator status-running">
        <span class="status-dot"></span>
        <span class="status-text">Simulation Running</span>
      </div>
      <div class="status-meta">
        <span class="mono">PID: 1842</span>
        <span>Uptime: 2h 34m 12s</span>
      </div>
    </section>

    <!-- Control Buttons -->
    <section class="control-bar">
      <button class="btn btn-danger" id="btn-stop">⏹ Stop</button>
      <button class="btn btn-success" id="btn-start" disabled>▶ Start</button>
      <button class="btn btn-warning" id="btn-restart">🔄 Restart</button>
      <button class="btn" id="btn-reset">↺ Reset to Initial State</button>
    </section>

    <!-- Current Configuration -->
    <section class="detail-section">
      <h2>Running Configuration</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">OPDL File</span>
          <span class="prop-value mono">vendor/smartx/smartx.opdl.json</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Mode</span>
          <span class="prop-value">Serve (Continuous)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Delta Time</span>
          <span class="prop-value mono">0.016s (≈60fps)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Max Ticks</span>
          <span class="prop-value mono">100,000 (循环)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">WebSocket Address</span>
          <span class="prop-value mono">0.0.0.0:9001</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Entity Count</span>
          <span class="prop-value">8</span>
        </div>
      </div>
    </section>

    <!-- Performance Metrics -->
    <section class="detail-section">
      <h2>Performance Metrics</h2>
      <div class="summary-bar">
        <div class="summary-card">
          <span class="summary-label">Current Tick</span>
          <span class="summary-value mono">42,318</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Ticks/ms</span>
          <span class="summary-value mono text-success">2.47</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Tick Latency</span>
          <span class="summary-value mono">0.41ms</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">WS Clients</span>
          <span class="summary-value mono">1</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Buffer Size</span>
          <span class="summary-value mono">3,600</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Memory Usage</span>
          <span class="summary-value mono">24.3 MB</span>
        </div>
      </div>
    </section>

    <!-- Simulation Parameters Form -->
    <section class="detail-section">
      <h2>Parameter Override (Next Restart)</h2>
      <form class="settings-form" onsubmit="return false">
        <div class="form-group">
          <label for="sim-opdl">OPDL File Path</label>
          <input type="text" id="sim-opdl" value="vendor/smartx/smartx.opdl.json" class="form-input mono" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="sim-ticks">Max Ticks</label>
            <input type="number" id="sim-ticks" value="100000" class="form-input mono" />
          </div>
          <div class="form-group">
            <label for="sim-delta">Delta Time (s)</label>
            <input type="number" id="sim-delta" value="0.016" step="0.001" class="form-input mono" />
          </div>
        </div>
        <div class="form-group">
          <label for="sim-ws-addr">WebSocket Bind Address</label>
          <input type="text" id="sim-ws-addr" value="0.0.0.0:9001" class="form-input mono" />
        </div>
        <button type="submit" class="btn btn-primary">Apply & Restart</button>
      </form>
    </section>

    <!-- CLI Command Reference -->
    <section class="detail-section">
      <h2>CLI Command Reference</h2>
      <div class="code-block">
        <code># Batch mode (run and exit)
omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --ticks 1000

# Serve mode (continuous + WebSocket)
omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --serve

# Custom WebSocket address
omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --serve --ws-addr 127.0.0.1:8080

# With JSON output
omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --ticks 1000 --output report.json</code>
      </div>
    </section>
  `;
}
