/**
 * Dashboard page — live telemetry overview.
 *
 * Re-uses the core render functions from dashboard.ts,
 * providing the HTML shell for the main content area.
 */

import { renderFrame, renderConnectionState, renderCpuHistory } from "../dashboard";
import { generateMockHistory, getEntityNames } from "../mock";
import type { TelemetryFrame } from "../types";

/** Render the dashboard page HTML into the container. */
export function renderDashboardPage(container: HTMLElement): void {
  container.innerHTML = `
    <!-- Frame Info Bar -->
    <section class="info-bar">
      <div class="info-item">
        <span class="info-label">Tick</span>
        <span id="frame-tick" class="info-value">—</span>
      </div>
      <div class="info-item">
        <span class="info-label">State Hash</span>
        <span id="frame-hash" class="info-value mono">—</span>
      </div>
      <div class="info-item">
        <span class="info-label">Timestamp</span>
        <span id="frame-time" class="info-value">—</span>
      </div>
    </section>

    <!-- Cluster Summary -->
    <section class="summary-bar">
      <div class="summary-card">
        <span class="summary-label">Entities</span>
        <span id="summary-entities" class="summary-value">0</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Avg CPU</span>
        <span id="summary-cpu" class="summary-value">0.0%</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Avg Memory</span>
        <span id="summary-memory" class="summary-value">0.0%</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Net TX</span>
        <span id="summary-net-tx" class="summary-value">0.0%</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Net RX</span>
        <span id="summary-net-rx" class="summary-value">0.0%</span>
      </div>
      <div class="summary-card alert-card-normal">
        <span class="summary-label">Normal</span>
        <span id="alert-normal" class="summary-value">0</span>
      </div>
      <div class="summary-card alert-card-warning">
        <span class="summary-label">Warning</span>
        <span id="alert-warning" class="summary-value">0</span>
      </div>
      <div class="summary-card alert-card-critical">
        <span class="summary-label">Critical</span>
        <span id="alert-critical" class="summary-value">0</span>
      </div>
    </section>

    <!-- CPU History Chart -->
    <section class="chart-section">
      <h2>CPU Usage History</h2>
      <div id="cpu-chart" class="chart-container">
        <svg width="600" height="120" class="chart-svg">
          <text x="300" y="60" text-anchor="middle" fill="#888">Waiting for data…</text>
        </svg>
      </div>
    </section>

    <!-- Entity Table -->
    <section class="table-section">
      <h2>Entity Details</h2>
      <table>
        <thead>
          <tr>
            <th>Index</th>
            <th>Name</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Net TX</th>
            <th>Net RX</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="entity-tbody">
          <tr><td colspan="7" class="empty-row">No data — waiting for telemetry connection</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

/** Populate the dashboard with mock data for demo mode. */
export function populateDashboardMock(): void {
  const history = generateMockHistory(80, 8);
  const latestFrame = history[history.length - 1];

  renderConnectionState("connected");
  renderFrame(latestFrame, history);
  renderCpuHistory(history);

  // Make entity rows clickable
  makeEntityRowsClickable(latestFrame);
}

/** Make entity table rows navigate to entity detail. */
export function makeEntityRowsClickable(frame: TelemetryFrame): void {
  const tbody = document.getElementById("entity-tbody");
  if (!tbody) return;

  const names = getEntityNames();
  const rows = tbody.querySelectorAll("tr");
  rows.forEach((row, index) => {
    if (index < frame.entities.length) {
      row.style.cursor = "pointer";
      row.title = `Click to view details for ${names[index] ?? `entity-${index}`}`;
      row.addEventListener("click", () => {
        window.location.hash = `#/entity/${index}`;
      });
    }
  });
}
