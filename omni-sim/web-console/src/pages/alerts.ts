/**
 * Alerts & Events page — alert history and management.
 */

import { getMockAlerts } from "../mock";
import { formatPercent } from "../telemetry";

export function renderAlertsPage(container: HTMLElement): void {
  const alerts = getMockAlerts();
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  container.innerHTML = `
    <div class="page-header">
      <h2>Alerts & Events</h2>
      <div class="alert-summary-badges">
        <span class="badge badge-danger">${activeAlerts.filter((a) => a.severity === "critical").length} Critical</span>
        <span class="badge badge-warning">${activeAlerts.filter((a) => a.severity === "warning").length} Warning</span>
        <span class="badge badge-muted">${resolvedAlerts.length} Resolved</span>
      </div>
    </div>

    <!-- Filter Bar -->
    <section class="filter-bar">
      <button class="btn filter-btn filter-active" data-filter="all">All (${alerts.length})</button>
      <button class="btn filter-btn" data-filter="active">Active (${activeAlerts.length})</button>
      <button class="btn filter-btn" data-filter="critical">Critical</button>
      <button class="btn filter-btn" data-filter="warning">Warning</button>
      <button class="btn filter-btn" data-filter="resolved">Resolved</button>
    </section>

    <!-- Active Alerts -->
    ${activeAlerts.length > 0 ? `
    <section class="detail-section">
      <h2>Active Alerts (${activeAlerts.length})</h2>
      <div class="alert-list">
        ${activeAlerts.map((a) => renderAlertCard(a)).join("")}
      </div>
    </section>
    ` : ""}

    <!-- Resolved Alerts -->
    <section class="detail-section">
      <h2>Resolved (${resolvedAlerts.length})</h2>
      <div class="alert-list">
        ${resolvedAlerts.map((a) => renderAlertCard(a)).join("")}
      </div>
    </section>

    <!-- Alert Rules -->
    <section class="detail-section">
      <h2>Alert Rules (§5.3 Thresholds)</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Warning Threshold</th>
            <th>Critical Threshold</th>
            <th>Evaluation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CPU Usage</td>
            <td class="text-warning">≥ 70%</td>
            <td class="text-danger">≥ 90%</td>
            <td>Per-entity, per-tick</td>
          </tr>
          <tr>
            <td>Memory Usage</td>
            <td class="text-warning">≥ 70%</td>
            <td class="text-danger">≥ 90%</td>
            <td>Per-entity, per-tick</td>
          </tr>
          <tr>
            <td>Network TX</td>
            <td class="text-warning">≥ 70%</td>
            <td class="text-danger">≥ 90%</td>
            <td>Per-entity, per-tick</td>
          </tr>
          <tr>
            <td>Network RX</td>
            <td class="text-warning">≥ 70%</td>
            <td class="text-danger">≥ 90%</td>
            <td>Per-entity, per-tick</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

interface AlertInfo {
  id: number;
  timestamp: number;
  entityIndex: number;
  entityName: string;
  severity: string;
  metric: string;
  value: number;
  message: string;
  resolved: boolean;
}

function renderAlertCard(alert: AlertInfo): string {
  const time = new Date(alert.timestamp).toLocaleString();
  const severityClass = alert.severity === "critical" ? "alert-critical" : "alert-warning";
  const resolvedClass = alert.resolved ? "alert-resolved" : "";

  return `
    <div class="alert-card ${severityClass} ${resolvedClass}">
      <div class="alert-card-header">
        <span class="alert-severity-icon">${alert.severity === "critical" ? "🔴" : "🟡"}</span>
        <span class="alert-title">${alert.message}</span>
        ${alert.resolved ? '<span class="badge badge-resolved">Resolved</span>' : ""}
      </div>
      <div class="alert-card-meta">
        <span class="alert-entity">
          <a href="#/entity/${alert.entityIndex}">${alert.entityName}</a>
        </span>
        <span class="alert-metric">${alert.metric}: ${formatPercent(alert.value)}</span>
        <span class="alert-time">${time}</span>
      </div>
    </div>
  `;
}
