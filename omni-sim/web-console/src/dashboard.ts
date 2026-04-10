/**
 * Dashboard renderer — updates DOM elements with telemetry data.
 *
 * Uses vanilla TypeScript — no framework dependency.
 * All DOM operations are isolated here for testability.
 */

import type { TelemetryFrame, ConnectionState, ClusterSummary } from "./types";
import { computeSummary, formatPercent, statusClass, shortHash } from "./telemetry";

/** Safely set text content of an element by ID (no-op if not found). */
function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Update connection status indicator. */
export function renderConnectionState(state: ConnectionState): void {
  const el = document.getElementById("conn-status");
  if (!el) return;

  const labels: Record<ConnectionState, string> = {
    disconnected: "⚪ Disconnected",
    connecting: "🟡 Connecting…",
    connected: "🟢 Connected",
    error: "🔴 Connection Error",
  };
  el.textContent = labels[state];
  el.className = `conn-${state}`;
}

/** Render the cluster summary bar. */
function renderSummary(summary: ClusterSummary): void {
  setText("summary-entities", `${summary.entityCount}`);
  setText("summary-cpu", formatPercent(summary.avgCpu));
  setText("summary-memory", formatPercent(summary.avgMemory));
  setText("summary-net-tx", formatPercent(summary.avgNetworkTx));
  setText("summary-net-rx", formatPercent(summary.avgNetworkRx));
  setText("alert-normal", `${summary.normalCount}`);
  setText("alert-warning", `${summary.warningCount}`);
  setText("alert-critical", `${summary.criticalCount}`);
}

/** Render the entity table. */
function renderEntityTable(frame: TelemetryFrame): void {
  const tbody = document.getElementById("entity-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  for (const entity of frame.entities) {
    const tr = document.createElement("tr");
    tr.className = statusClass(entity.status);
    tr.innerHTML = `
      <td>${entity.index}</td>
      <td>${formatPercent(entity.cpu)}</td>
      <td>${formatPercent(entity.memory)}</td>
      <td>${formatPercent(entity.network_tx)}</td>
      <td>${formatPercent(entity.network_rx)}</td>
      <td class="status-cell ${statusClass(entity.status)}">${entity.status.toUpperCase()}</td>
    `;
    tbody.appendChild(tr);
  }
}

/** Render the frame header (tick, hash, timestamp). */
function renderFrameHeader(frame: TelemetryFrame): void {
  setText("frame-tick", `${frame.tick}`);
  setText("frame-hash", shortHash(frame.state_hash));
  setText("frame-time", new Date(frame.timestamp_ms).toLocaleTimeString());
}

/** Render the CPU history sparkline as an inline SVG. */
export function renderCpuHistory(history: ReadonlyArray<TelemetryFrame>): void {
  const container = document.getElementById("cpu-chart");
  if (!container) return;

  const W = 600;
  const H = 120;
  const points: string[] = [];

  const recent = history.slice(-100); // last 100 frames
  if (recent.length < 2) {
    container.innerHTML = `<svg width="${W}" height="${H}" class="chart-svg">
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#888">Waiting for data…</text>
    </svg>`;
    return;
  }

  for (let i = 0; i < recent.length; i++) {
    const frame = recent[i];
    const summary = computeSummary(frame.entities);
    const x = (i / (recent.length - 1)) * W;
    const y = H - summary.avgCpu * H;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Warning/critical threshold lines
  const warnY = H - 0.7 * H;
  const critY = H - 0.9 * H;

  container.innerHTML = `<svg width="${W}" height="${H}" class="chart-svg">
    <line x1="0" y1="${warnY}" x2="${W}" y2="${warnY}" stroke="#f59e0b" stroke-dasharray="4 4" opacity="0.5"/>
    <line x1="0" y1="${critY}" x2="${W}" y2="${critY}" stroke="#ef4444" stroke-dasharray="4 4" opacity="0.5"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <text x="4" y="${warnY - 2}" fill="#f59e0b" font-size="10">70%</text>
    <text x="4" y="${critY - 2}" fill="#ef4444" font-size="10">90%</text>
  </svg>`;
}

/** Main render function — called on each incoming frame. */
export function renderFrame(
  frame: TelemetryFrame,
  history: ReadonlyArray<TelemetryFrame>,
): void {
  const summary = computeSummary(frame.entities);
  renderFrameHeader(frame);
  renderSummary(summary);
  renderEntityTable(frame);
  renderCpuHistory(history);
}
