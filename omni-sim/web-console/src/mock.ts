/**
 * Mock data generator for Omni-Sim Web Console demo mode.
 *
 * Produces realistic TelemetryFrame data when no WebSocket server is available.
 * Used automatically when the connection fails, providing a live demo experience.
 */

import type { TelemetryFrame, EntitySample, AlertStatus } from "./types";

/** Seeded pseudo-random number generator (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a realistic hex hash string. */
function fakeHash(tick: number): string {
  const rng = mulberry32(tick * 7919);
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(rng() * 16).toString(16);
  }
  return hash;
}

/** Determine alert status from CPU value. */
function statusFromCpu(cpu: number): AlertStatus {
  if (cpu >= 0.9) return "critical";
  if (cpu >= 0.7) return "warning";
  return "normal";
}

/** Generate a single mock entity sample. */
function mockEntity(index: number, tick: number, rng: () => number): EntitySample {
  // Each entity has a base load that varies over time
  const phase = (tick * 0.02 + index * 1.7) % (2 * Math.PI);
  const baseCpu = 0.3 + 0.25 * Math.sin(phase) + rng() * 0.15;
  const cpu = Math.max(0, Math.min(1, baseCpu));
  const memory = Math.max(0, Math.min(1, 0.2 + cpu * 0.5 + rng() * 0.1));
  const networkTx = Math.max(0, Math.min(1, 0.05 + cpu * 0.3 + rng() * 0.05));
  const networkRx = Math.max(0, Math.min(1, 0.03 + cpu * 0.25 + rng() * 0.08));

  return {
    index,
    cpu,
    memory,
    network_tx: networkTx,
    network_rx: networkRx,
    status: statusFromCpu(cpu),
  };
}

/** Generate a single mock telemetry frame. */
export function generateMockFrame(tick: number, entityCount: number): TelemetryFrame {
  const rng = mulberry32(tick * 31337 + 42);
  const entities: EntitySample[] = [];

  for (let i = 0; i < entityCount; i++) {
    entities.push(mockEntity(i, tick, rng));
  }

  return {
    type: "telemetry",
    tick,
    timestamp_ms: Date.now() - (100 - tick) * 160,
    state_hash: fakeHash(tick),
    entities,
  };
}

/** Generate a history of mock frames for chart display. */
export function generateMockHistory(
  frameCount: number,
  entityCount: number,
): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < frameCount; i++) {
    const tick = i * 10;
    const rng = mulberry32(tick * 31337 + 42);
    const entities: EntitySample[] = [];

    for (let j = 0; j < entityCount; j++) {
      entities.push(mockEntity(j, tick, rng));
    }

    frames.push({
      type: "telemetry",
      tick,
      timestamp_ms: baseTime - (frameCount - i) * 1000,
      state_hash: fakeHash(tick),
      entities,
    });
  }

  return frames;
}

/** Demo OPDL pack definitions. */
export interface PackInfo {
  name: string;
  vendor: string;
  version: string;
  entityCount: number;
  description: string;
  status: "loaded" | "available" | "error";
  path: string;
}

export function getMockPacks(): PackInfo[] {
  return [
    {
      name: "SmartX HCI",
      vendor: "SmartX",
      version: "1.2.0",
      entityCount: 8,
      description: "SmartX 超融合基础架构仿真包 — 含计算节点、存储池、网络交换",
      status: "loaded",
      path: "vendor/smartx/smartx.opdl.json",
    },
    {
      name: "VMware vSphere",
      vendor: "VMware",
      version: "0.9.0",
      entityCount: 12,
      description: "VMware vSphere 虚拟化平台仿真包 — ESXi 主机 + vCenter",
      status: "available",
      path: "vendor/vmware/vsphere.opdl.json",
    },
    {
      name: "Huawei FusionCompute",
      vendor: "Huawei",
      version: "0.7.0",
      entityCount: 10,
      description: "华为 FusionCompute 云计算仿真包 — CNA + VRM 管理节点",
      status: "available",
      path: "vendor/huawei/fusioncompute.opdl.json",
    },
    {
      name: "AWS EC2 Cluster",
      vendor: "AWS",
      version: "0.5.0",
      entityCount: 16,
      description: "AWS EC2 实例集群仿真 — 含 Auto Scaling Group + ELB",
      status: "available",
      path: "vendor/aws/ec2-cluster.opdl.json",
    },
  ];
}

/** Mock alert events. */
export interface AlertEvent {
  id: number;
  timestamp: number;
  entityIndex: number;
  entityName: string;
  severity: AlertStatus;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
}

export function getMockAlerts(): AlertEvent[] {
  const now = Date.now();
  return [
    {
      id: 1,
      timestamp: now - 120_000,
      entityIndex: 4,
      entityName: "compute-node-4",
      severity: "critical",
      metric: "cpu",
      value: 0.95,
      threshold: 0.9,
      message: "CPU 使用率超过 90% 阈值",
      resolved: false,
    },
    {
      id: 2,
      timestamp: now - 300_000,
      entityIndex: 2,
      entityName: "compute-node-2",
      severity: "warning",
      metric: "cpu",
      value: 0.78,
      threshold: 0.7,
      message: "CPU 使用率超过 70% 警告阈值",
      resolved: false,
    },
    {
      id: 3,
      timestamp: now - 600_000,
      entityIndex: 6,
      entityName: "storage-pool-1",
      severity: "warning",
      metric: "memory",
      value: 0.73,
      threshold: 0.7,
      message: "内存使用率超过 70% 警告阈值",
      resolved: false,
    },
    {
      id: 4,
      timestamp: now - 1_800_000,
      entityIndex: 1,
      entityName: "compute-node-1",
      severity: "warning",
      metric: "cpu",
      value: 0.72,
      threshold: 0.7,
      message: "CPU 使用率超过 70% 警告阈值",
      resolved: true,
    },
    {
      id: 5,
      timestamp: now - 3_600_000,
      entityIndex: 7,
      entityName: "network-switch-0",
      severity: "critical",
      metric: "network_tx",
      value: 0.92,
      threshold: 0.9,
      message: "网络发送带宽超过 90% 阈值",
      resolved: true,
    },
    {
      id: 6,
      timestamp: now - 5_400_000,
      entityIndex: 3,
      entityName: "compute-node-3",
      severity: "warning",
      metric: "memory",
      value: 0.75,
      threshold: 0.7,
      message: "内存使用率超过 70% 警告阈值",
      resolved: true,
    },
    {
      id: 7,
      timestamp: now - 7_200_000,
      entityIndex: 5,
      entityName: "storage-pool-0",
      severity: "critical",
      metric: "cpu",
      value: 0.93,
      threshold: 0.9,
      message: "CPU 使用率超过 90% 阈值",
      resolved: true,
    },
    {
      id: 8,
      timestamp: now - 10_800_000,
      entityIndex: 0,
      entityName: "compute-node-0",
      severity: "warning",
      metric: "network_rx",
      value: 0.71,
      threshold: 0.7,
      message: "网络接收带宽超过 70% 警告阈值",
      resolved: true,
    },
  ];
}

/** Entity names for the SmartX pack. */
export function getEntityNames(): string[] {
  return [
    "compute-node-0",
    "compute-node-1",
    "compute-node-2",
    "compute-node-3",
    "compute-node-4",
    "storage-pool-0",
    "storage-pool-1",
    "network-switch-0",
  ];
}
