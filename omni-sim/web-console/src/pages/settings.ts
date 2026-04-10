/**
 * Settings page — system configuration.
 */

export function renderSettingsPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-header">
      <h2>Settings</h2>
      <span class="page-subtitle">System configuration and preferences</span>
    </div>

    <!-- Connection Settings -->
    <section class="detail-section">
      <h2>Connection</h2>
      <form class="settings-form" onsubmit="return false">
        <div class="form-group">
          <label for="ws-url">WebSocket URL</label>
          <input type="text" id="ws-url" value="ws://127.0.0.1:9001" class="form-input mono" />
          <span class="form-hint">Telemetry server WebSocket endpoint</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="reconnect-delay">Max Reconnect Delay (ms)</label>
            <input type="number" id="reconnect-delay" value="10000" class="form-input mono" />
          </div>
          <div class="form-group">
            <label for="history-size">History Buffer Size</label>
            <input type="number" id="history-size" value="300" class="form-input mono" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Save Connection Settings</button>
      </form>
    </section>

    <!-- Alert Thresholds -->
    <section class="detail-section">
      <h2>Alert Thresholds</h2>
      <form class="settings-form" onsubmit="return false">
        <div class="form-row">
          <div class="form-group">
            <label for="thresh-warn">Warning Threshold (%)</label>
            <input type="number" id="thresh-warn" value="70" min="0" max="100" class="form-input mono" />
          </div>
          <div class="form-group">
            <label for="thresh-crit">Critical Threshold (%)</label>
            <input type="number" id="thresh-crit" value="90" min="0" max="100" class="form-input mono" />
          </div>
        </div>
        <span class="form-hint">Applied to CPU, Memory, Network TX, and Network RX metrics (§5.3)</span>
        <button type="submit" class="btn btn-primary">Save Thresholds</button>
      </form>
    </section>

    <!-- Display Settings -->
    <section class="detail-section">
      <h2>Display</h2>
      <form class="settings-form" onsubmit="return false">
        <div class="form-row">
          <div class="form-group">
            <label for="chart-points">Chart History Points</label>
            <input type="number" id="chart-points" value="100" class="form-input mono" />
          </div>
          <div class="form-group">
            <label for="refresh-rate">Dashboard Refresh (ms)</label>
            <input type="number" id="refresh-rate" value="100" class="form-input mono" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" checked />
            <span>Show entity names in dashboard table</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" checked />
            <span>Enable CPU chart threshold lines</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" />
            <span>Dark mode (always enabled in current version)</span>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Save Display Settings</button>
      </form>
    </section>

    <!-- Docker Deployment -->
    <section class="detail-section">
      <h2>Deployment Info</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">Deployment Mode</span>
          <span class="prop-value">Docker Compose</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Web Console Port</span>
          <span class="prop-value mono">3000 (nginx)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">WebSocket Port</span>
          <span class="prop-value mono">9001</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Container Image</span>
          <span class="prop-value mono">omni-sim:latest</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Restart Policy</span>
          <span class="prop-value">unless-stopped</span>
        </div>
      </div>
    </section>

    <!-- Reset -->
    <section class="detail-section">
      <h2>Danger Zone</h2>
      <div class="danger-zone">
        <div class="danger-item">
          <div>
            <strong>Reset All Settings</strong>
            <p class="form-hint">Restore all settings to factory defaults</p>
          </div>
          <button class="btn btn-danger">Reset Settings</button>
        </div>
        <div class="danger-item">
          <div>
            <strong>Clear Telemetry History</strong>
            <p class="form-hint">Remove all cached telemetry data from the browser</p>
          </div>
          <button class="btn btn-danger">Clear History</button>
        </div>
      </div>
    </section>
  `;
}
