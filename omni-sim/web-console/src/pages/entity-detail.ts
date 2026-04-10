/**
 * Entity Detail page — shows metrics for a single entity.
 */

import { formatPercent, statusClass } from "../telemetry";
import { generateMockHistory, getEntityNames } from "../mock";
import type { EntitySample } from "../types";

export function renderEntityDetailPage(
  container: HTMLElement,
  params: Record<string, string>,
): void {
  const entityIndex = parseInt(params.id ?? "0", 10);
  const names = getEntityNames();
  const entityName = names[entityIndex] ?? `entity-${entityIndex}`;

  // Get mock data for this entity
  const history = generateMockHistory(60, 8);
  const latestFrame = history[history.length - 1];
  const entity = latestFrame.entities[entityIndex];

  if (!entity) {
    container.innerHTML = `
      <div class="page-header">
        <a href="#/" class="btn btn-back">← Back to Dashboard</a>
        <h2>Entity Not Found</h2>
      </div>
      <div class="empty-state">
        <p>Entity #${entityIndex} does not exist in the current simulation.</p>
      </div>
    `;
    return;
  }

  // Build CPU history for this specific entity
  const cpuHistory = history.map((f) => f.entities[entityIndex]?.cpu ?? 0);
  const memHistory = history.map((f) => f.entities[entityIndex]?.memory ?? 0);

  container.innerHTML = `
    <div class="page-header">
      <a href="#/" class="btn btn-back">← Back to Dashboard</a>
      <h2>${entityName} <span class="entity-index">#${entityIndex}</span></h2>
      <span class="status-badge ${statusClass(entity.status)}">${entity.status.toUpperCase()}</span>
    </div>

    <!-- Entity Metrics Cards -->
    <section class="summary-bar">
      <div class="summary-card">
        <span class="summary-label">CPU</span>
        <span class="summary-value ${metricColorClass(entity.cpu)}">${formatPercent(entity.cpu)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Memory</span>
        <span class="summary-value ${metricColorClass(entity.memory)}">${formatPercent(entity.memory)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Network TX</span>
        <span class="summary-value">${formatPercent(entity.network_tx)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Network RX</span>
        <span class="summary-value">${formatPercent(entity.network_rx)}</span>
      </div>
    </section>

    <!-- CPU History Chart -->
    <section class="chart-section">
      <h2>CPU History (Last 60 Samples)</h2>
      <div class="chart-container">
        ${renderMiniChart(cpuHistory, "#3b82f6", "CPU")}
      </div>
    </section>

    <!-- Memory History Chart -->
    <section class="chart-section">
      <h2>Memory History (Last 60 Samples)</h2>
      <div class="chart-container">
        ${renderMiniChart(memHistory, "#8b5cf6", "Memory")}
      </div>
    </section>

    <!-- Entity Properties -->
    <section class="detail-section">
      <h2>Entity Properties</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">Name</span>
          <span class="prop-value">${entityName}</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Index</span>
          <span class="prop-value mono">${entityIndex}</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Status</span>
          <span class="prop-value ${statusClass(entity.status)}">${entity.status.toUpperCase()}</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Type</span>
          <span class="prop-value">${entityType(entityIndex)}</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Pack</span>
          <span class="prop-value">SmartX HCI v1.2.0</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Last Updated</span>
          <span class="prop-value mono">${new Date(latestFrame.timestamp_ms).toLocaleString()}</span>
        </div>
      </div>
    </section>

    <!-- Alert Thresholds -->
    <section class="detail-section">
      <h2>Alert Thresholds</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">CPU Warning</span>
          <span class="prop-value threshold-warning">70%</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">CPU Critical</span>
          <span class="prop-value threshold-critical">90%</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Memory Warning</span>
          <span class="prop-value threshold-warning">70%</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Memory Critical</span>
          <span class="prop-value threshold-critical">90%</span>
        </div>
      </div>
    </section>
  `;
}

function metricColorClass(value: number): string {
  if (value >= 0.9) return "text-danger";
  if (value >= 0.7) return "text-warning";
  return "text-success";
}

function entityType(index: number): string {
  if (index <= 4) return "Compute Node";
  if (index <= 6) return "Storage Pool";
  return "Network Switch";
}

function renderMiniChart(values: number[], color: string, _label: string): string {
  const W = 600;
  const H = 100;
  if (values.length < 2) {
    return `<svg width="${W}" height="${H}" class="chart-svg">
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#888">No data</text>
    </svg>`;
  }

  const points: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const x = (i / (values.length - 1)) * W;
    const y = H - values[i] * H;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const warnY = H - 0.7 * H;
  const critY = H - 0.9 * H;

  return `<svg width="${W}" height="${H}" class="chart-svg" viewBox="0 0 ${W} ${H}">
    <line x1="0" y1="${warnY}" x2="${W}" y2="${warnY}" stroke="#f59e0b" stroke-dasharray="4 4" opacity="0.4"/>
    <line x1="0" y1="${critY}" x2="${W}" y2="${critY}" stroke="#ef4444" stroke-dasharray="4 4" opacity="0.4"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>
    <text x="4" y="${warnY - 2}" fill="#f59e0b" font-size="10">70%</text>
    <text x="4" y="${critY - 2}" fill="#ef4444" font-size="10">90%</text>
  </svg>`;
}

/** Suppress unused parameter warning — label reserved for future axis title */
export type { EntitySample };
