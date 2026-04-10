/**
 * Telemetry data transforms and validation.
 *
 * Pure functions — no side effects, fully testable.
 */

import type {
  TelemetryFrame,
  EntitySample,
  AlertStatus,
  ClusterSummary,
} from "./types";

/** Type guard: validate an incoming WebSocket message as a TelemetryFrame. */
export function isTelemetryFrame(data: unknown): data is TelemetryFrame {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === "telemetry" &&
    typeof obj.tick === "number" &&
    typeof obj.timestamp_ms === "number" &&
    typeof obj.state_hash === "string" &&
    Array.isArray(obj.entities)
  );
}

/** Validate a single entity sample. */
export function isEntitySample(data: unknown): data is EntitySample {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.index === "number" &&
    typeof obj.cpu === "number" &&
    typeof obj.memory === "number" &&
    typeof obj.network_tx === "number" &&
    typeof obj.network_rx === "number" &&
    typeof obj.status === "string" &&
    isAlertStatus(obj.status)
  );
}

function isAlertStatus(value: unknown): value is AlertStatus {
  return value === "normal" || value === "warning" || value === "critical";
}

/** Compute cluster-level summary from entity samples. */
export function computeSummary(entities: EntitySample[]): ClusterSummary {
  if (entities.length === 0) {
    return {
      entityCount: 0,
      avgCpu: 0,
      avgMemory: 0,
      avgNetworkTx: 0,
      avgNetworkRx: 0,
      normalCount: 0,
      warningCount: 0,
      criticalCount: 0,
    };
  }

  let totalCpu = 0;
  let totalMem = 0;
  let totalTx = 0;
  let totalRx = 0;
  let normalCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  for (const e of entities) {
    totalCpu += e.cpu;
    totalMem += e.memory;
    totalTx += e.network_tx;
    totalRx += e.network_rx;
    switch (e.status) {
      case "normal":
        normalCount++;
        break;
      case "warning":
        warningCount++;
        break;
      case "critical":
        criticalCount++;
        break;
    }
  }

  const n = entities.length;
  return {
    entityCount: n,
    avgCpu: totalCpu / n,
    avgMemory: totalMem / n,
    avgNetworkTx: totalTx / n,
    avgNetworkRx: totalRx / n,
    normalCount,
    warningCount,
    criticalCount,
  };
}

/** Format a [0,1] ratio as a percentage string (e.g. "73.2%"). */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Return a CSS class name for the given alert status. */
export function statusClass(status: AlertStatus): string {
  switch (status) {
    case "normal":
      return "status-normal";
    case "warning":
      return "status-warning";
    case "critical":
      return "status-critical";
  }
}

/** Truncate a 64-char hex hash to a display-friendly short form. */
export function shortHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
