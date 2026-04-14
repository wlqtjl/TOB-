/**
 * Omni-Sim Telemetry Types
 *
 * Matches the §5.2 WebSocket JSON format exactly as defined in
 * omni-sim-telemetry/src/ws_server.rs and buffer.rs.
 */

/** Alert status — matches §5.3 thresholds (buffer.rs AlertStatus). */
export type AlertStatus = "normal" | "warning" | "critical";

/** Per-entity snapshot inside a telemetry frame. */
export interface EntitySample {
  index: number;
  cpu: number; // [0.0, 1.0]
  memory: number; // [0.0, 1.0]
  network_tx: number; // [0.0, 1.0]
  network_rx: number; // [0.0, 1.0]
  status: AlertStatus;
}

/** A single telemetry frame pushed via WebSocket (§5.2). */
export interface TelemetryFrame {
  type: "telemetry";
  tick: number;
  timestamp_ms: number;
  state_hash: string; // 64-char hex (Blake3)
  entities: EntitySample[];
}

/** Connection state of the WebSocket client. */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

/** Summary statistics computed from entity samples. */
export interface ClusterSummary {
  entityCount: number;
  avgCpu: number;
  avgMemory: number;
  avgNetworkTx: number;
  avgNetworkRx: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
}
