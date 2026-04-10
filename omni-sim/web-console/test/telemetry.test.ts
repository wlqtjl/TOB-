/**
 * Tests for telemetry data transforms and validation.
 */

import { describe, it, expect } from "vitest";
import {
  isTelemetryFrame,
  isEntitySample,
  computeSummary,
  formatPercent,
  statusClass,
  shortHash,
} from "../src/telemetry";
import type { EntitySample, TelemetryFrame } from "../src/types";

// ── isTelemetryFrame ──────────────────────────────────────────────────────

describe("isTelemetryFrame", () => {
  const validFrame: TelemetryFrame = {
    type: "telemetry",
    tick: 42,
    timestamp_ms: 1_000_000,
    state_hash: "a".repeat(64),
    entities: [],
  };

  it("accepts a valid frame", () => {
    expect(isTelemetryFrame(validFrame)).toBe(true);
  });

  it("rejects null", () => {
    expect(isTelemetryFrame(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isTelemetryFrame("string")).toBe(false);
    expect(isTelemetryFrame(42)).toBe(false);
  });

  it("rejects wrong type field", () => {
    expect(isTelemetryFrame({ ...validFrame, type: "other" })).toBe(false);
  });

  it("rejects missing tick", () => {
    const { tick: _, ...rest } = validFrame;
    expect(isTelemetryFrame(rest)).toBe(false);
  });

  it("rejects non-number tick", () => {
    expect(isTelemetryFrame({ ...validFrame, tick: "42" })).toBe(false);
  });

  it("rejects missing entities array", () => {
    expect(
      isTelemetryFrame({ ...validFrame, entities: "not-array" }),
    ).toBe(false);
  });

  it("accepts frame with entities", () => {
    const frame = {
      ...validFrame,
      entities: [
        {
          index: 0,
          cpu: 0.5,
          memory: 0.3,
          network_tx: 0.1,
          network_rx: 0.05,
          status: "normal",
        },
      ],
    };
    expect(isTelemetryFrame(frame)).toBe(true);
  });
});

// ── isEntitySample ────────────────────────────────────────────────────────

describe("isEntitySample", () => {
  const validSample: EntitySample = {
    index: 0,
    cpu: 0.5,
    memory: 0.3,
    network_tx: 0.1,
    network_rx: 0.05,
    status: "normal",
  };

  it("accepts a valid sample", () => {
    expect(isEntitySample(validSample)).toBe(true);
  });

  it("rejects null", () => {
    expect(isEntitySample(null)).toBe(false);
  });

  it("rejects missing cpu", () => {
    const { cpu: _, ...rest } = validSample;
    expect(isEntitySample(rest)).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(isEntitySample({ ...validSample, status: "unknown" })).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["normal", "warning", "critical"] as const) {
      expect(isEntitySample({ ...validSample, status })).toBe(true);
    }
  });
});

// ── computeSummary ────────────────────────────────────────────────────────

describe("computeSummary", () => {
  it("returns zeros for empty entities", () => {
    const s = computeSummary([]);
    expect(s.entityCount).toBe(0);
    expect(s.avgCpu).toBe(0);
    expect(s.normalCount).toBe(0);
  });

  it("computes correct averages", () => {
    const entities: EntitySample[] = [
      { index: 0, cpu: 0.2, memory: 0.4, network_tx: 0.1, network_rx: 0.2, status: "normal" },
      { index: 1, cpu: 0.8, memory: 0.6, network_tx: 0.3, network_rx: 0.4, status: "warning" },
    ];
    const s = computeSummary(entities);
    expect(s.entityCount).toBe(2);
    expect(s.avgCpu).toBeCloseTo(0.5);
    expect(s.avgMemory).toBeCloseTo(0.5);
    expect(s.avgNetworkTx).toBeCloseTo(0.2);
    expect(s.avgNetworkRx).toBeCloseTo(0.3);
    expect(s.normalCount).toBe(1);
    expect(s.warningCount).toBe(1);
    expect(s.criticalCount).toBe(0);
  });

  it("counts all alert types correctly", () => {
    const entities: EntitySample[] = [
      { index: 0, cpu: 0.1, memory: 0.1, network_tx: 0, network_rx: 0, status: "normal" },
      { index: 1, cpu: 0.8, memory: 0.3, network_tx: 0, network_rx: 0, status: "warning" },
      { index: 2, cpu: 0.95, memory: 0.9, network_tx: 0, network_rx: 0, status: "critical" },
      { index: 3, cpu: 0.95, memory: 0.9, network_tx: 0, network_rx: 0, status: "critical" },
    ];
    const s = computeSummary(entities);
    expect(s.normalCount).toBe(1);
    expect(s.warningCount).toBe(1);
    expect(s.criticalCount).toBe(2);
  });
});

// ── formatPercent ─────────────────────────────────────────────────────────

describe("formatPercent", () => {
  it("formats 0.5 as 50.0%", () => {
    expect(formatPercent(0.5)).toBe("50.0%");
  });

  it("formats 1.0 as 100.0%", () => {
    expect(formatPercent(1.0)).toBe("100.0%");
  });

  it("formats 0 as 0.0%", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats 0.732 as 73.2%", () => {
    expect(formatPercent(0.732)).toBe("73.2%");
  });
});

// ── statusClass ───────────────────────────────────────────────────────────

describe("statusClass", () => {
  it("returns correct class names", () => {
    expect(statusClass("normal")).toBe("status-normal");
    expect(statusClass("warning")).toBe("status-warning");
    expect(statusClass("critical")).toBe("status-critical");
  });
});

// ── shortHash ─────────────────────────────────────────────────────────────

describe("shortHash", () => {
  it("truncates 64-char hash", () => {
    const hash = "a3f9b2c7d1e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4";
    const short = shortHash(hash);
    expect(short).toBe("a3f9b2c7…c8d0e2f4");
    expect(short.length).toBe(17); // 8 + … + 8
  });

  it("returns short hash as-is", () => {
    expect(shortHash("abcd1234")).toBe("abcd1234");
  });
});
