/**
 * WorldState + ConsequencesEngine + AnimationCatalog + VisualBridge Tests
 *
 * Covers:
 * - WorldState pure functions (updateNodeInState, updateLinkInState, etc.)
 * - ConsequencesEngine (executeActionPure, calculateDamageReport)
 * - AnimationCatalog (findMatchingAnimations, mergeAnimationCatalogs)
 * - VisualBridge (detectChanges, applyWorldStateChanges)
 */

import { describe, it, expect } from 'vitest';
import type {
  WorldState,
  WorldNode,
  WorldLink,
  ConsequencesConfig,
  ConsequenceAction,
  DisasterEvent,
  AnimationCatalog,
  AnimationMapping,
} from '@skillquest/types';
import {
  updateNodeInState,
  updateLinkInState,
  addTimelineEntry,
  executeActionPure,
  calculateDamageReport,
} from '../world-state';
import {
  DEFAULT_ANIMATION_CATALOG,
  findMatchingAnimations,
  mergeAnimationCatalogs,
} from '../animation-catalog';
import {
  detectChanges,
  applyWorldStateChanges,
} from '../world-state-visual-bridge';
import { defaultViewport, defaultFeedback } from '../visual-scene';
import type { VisualScene } from '../visual-scene';

// ─── Test Data Factories ──────────────────────────────────────────

function createNode(overrides: Partial<WorldNode> = {}): WorldNode {
  return {
    id: 'node-1',
    label: 'Test Node',
    category: 'server',
    status: 'normal',
    load: 0.5,
    ioLatencyMs: 10,
    dataIntegrity: 1.0,
    metrics: {},
    ...overrides,
  };
}

function createLink(overrides: Partial<WorldLink> = {}): WorldLink {
  return {
    id: 'link-1',
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    status: 'connected',
    bandwidthUsage: 0.3,
    latencyMs: 2,
    ...overrides,
  };
}

function createWorldState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    nodes: [
      createNode({ id: 'node-1', label: 'Node 1' }),
      createNode({ id: 'node-2', label: 'Node 2' }),
      createNode({ id: 'node-3', label: 'Node 3' }),
    ],
    links: [
      createLink({ id: 'link-1-2', fromNodeId: 'node-1', toNodeId: 'node-2' }),
      createLink({ id: 'link-2-3', fromNodeId: 'node-2', toNodeId: 'node-3' }),
    ],
    slaScore: 100,
    downtimeMs: 0,
    timeline: [],
    ...overrides,
  };
}

function createConsequencesConfig(): ConsequencesConfig {
  const checkMetrics: ConsequenceAction = {
    id: 'check_metrics',
    label: '检查监控指标',
    description: '查看节点监控数据',
    prerequisites: [],
    effects: [],
    isOptimal: true,
    disasterProbability: 0,
  };

  const rebootNode: ConsequenceAction = {
    id: 'reboot_node',
    label: '重启节点',
    description: '直接重启故障节点',
    prerequisites: [],
    effects: [
      { targetNodeId: 'node-1', field: 'status', value: 'rebooting', delayMs: 0 },
    ],
    isOptimal: false,
    disasterProbability: 0.7,
  };

  const targetedFix: ConsequenceAction = {
    id: 'targeted_fix',
    label: '针对性修复',
    description: '根据指标定位并修复',
    prerequisites: ['check_metrics'],
    effects: [
      { targetNodeId: 'node-1', field: 'status', value: 'normal', delayMs: 0 },
    ],
    isOptimal: true,
    disasterProbability: 0,
  };

  const disaster: DisasterEvent = {
    id: 'disaster-split-brain',
    name: '脑裂',
    description: '集群出现脑裂，数据一致性受损',
    type: 'split_brain',
    severity: 'catastrophic',
    affectedNodeIds: ['node-1', 'node-2'],
    damage: {
      downtimeMs: 3600000,
      slaLoss: 50,
      dataLossPercent: 0.05,
      businessImpact: '核心业务停摆1小时',
    },
  };

  return {
    actions: [checkMetrics, rebootNode, targetedFix],
    optimalPath: ['check_metrics', 'targeted_fix'],
    disasters: [disaster],
    initialSlaScore: 100,
  };
}

function createScene(): VisualScene {
  return {
    id: 'test-scene',
    title: 'Test',
    sourceType: 'test',
    entities: [
      {
        id: 'node-1',
        type: 'device',
        label: 'Node 1',
        icon: '🖥',
        position: { x: 100, y: 100 },
        size: { w: 80, h: 80 },
        style: { fill: '#1a1a2e', stroke: '#22c55e', strokeWidth: 2, opacity: 1 },
        draggable: false,
        metadata: {},
      },
      {
        id: 'node-2',
        type: 'device',
        label: 'Node 2',
        icon: '🖥',
        position: { x: 300, y: 100 },
        size: { w: 80, h: 80 },
        style: { fill: '#1a1a2e', stroke: '#22c55e', strokeWidth: 2, opacity: 1 },
        draggable: false,
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'link-1-2',
        from: 'node-1',
        to: 'node-2',
        style: { color: '#22c55e', width: 2, opacity: 0.8 },
        particleConfig: { enabled: false, color: '#fff', speed: 0, size: 0, density: 0, trailLength: 0, shape: 'circle' },
        bidirectional: false,
      },
    ],
    interactions: [],
    feedback: defaultFeedback(),
    viewport: defaultViewport(),
  };
}

// ─── WorldState Pure Functions ─────────────────────────────────────

describe('WorldState — updateNodeInState', () => {
  it('should update a specific node status', () => {
    const state = createWorldState();
    const updated = updateNodeInState(state, 'node-1', { status: 'offline' });
    
    expect(updated.nodes[0].status).toBe('offline');
    expect(updated.nodes[1].status).toBe('normal'); // unchanged
    expect(updated.nodes[2].status).toBe('normal'); // unchanged
  });

  it('should update node load', () => {
    const state = createWorldState();
    const updated = updateNodeInState(state, 'node-2', { load: 0.95 });
    
    expect(updated.nodes[1].load).toBe(0.95);
    expect(updated.nodes[0].load).toBe(0.5); // unchanged
  });

  it('should not mutate original state', () => {
    const state = createWorldState();
    const original = state.nodes[0].status;
    updateNodeInState(state, 'node-1', { status: 'offline' });
    
    expect(state.nodes[0].status).toBe(original);
  });
});

describe('WorldState — updateLinkInState', () => {
  it('should update a specific link status', () => {
    const state = createWorldState();
    const updated = updateLinkInState(state, 'link-1-2', { status: 'partitioned' });
    
    expect(updated.links[0].status).toBe('partitioned');
    expect(updated.links[1].status).toBe('connected'); // unchanged
  });
});

describe('WorldState — addTimelineEntry', () => {
  it('should append a timeline entry', () => {
    const state = createWorldState();
    const node = state.nodes[0];
    const updated = addTimelineEntry(state, 'REBOOT_NODE', 'node-1', node, { status: 'rebooting' });
    
    expect(updated.timeline).toHaveLength(1);
    expect(updated.timeline[0].actionType).toBe('REBOOT_NODE');
    expect(updated.timeline[0].targetNodeId).toBe('node-1');
  });
});

// ─── Consequences Engine ──────────────────────────────────────────

describe('ConsequencesEngine — executeActionPure', () => {
  it('should execute an action without prerequisites', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    const result = executeActionPure(state, 'check_metrics', [], config);
    
    expect(result.success).toBe(true);
    expect(result.disaster).toBeNull();
  });

  it('should fail when prerequisites not met', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    const result = executeActionPure(state, 'targeted_fix', [], config);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('check_metrics');
  });

  it('should succeed when prerequisites are met', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    const result = executeActionPure(state, 'targeted_fix', ['check_metrics'], config);
    
    expect(result.success).toBe(true);
  });

  it('should apply immediate effects', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    // Use zero disaster probability to test effects deterministically
    const safeConfig = {
      ...config,
      actions: config.actions.map(a =>
        a.id === 'reboot_node' ? { ...a, disasterProbability: 0 } : a,
      ),
    };
    
    const result = executeActionPure(state, 'reboot_node', [], safeConfig);
    
    // reboot_node has an effect to set node-1 status to 'rebooting'
    const node1 = result.newState.nodes.find(n => n.id === 'node-1');
    expect(node1?.status).toBe('rebooting');
  });

  it('should return unknown action message for invalid actionId', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    const result = executeActionPure(state, 'invalid_action', [], config);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('未知操作');
  });

  it('should deduct SLA for non-optimal actions without disaster', () => {
    const state = createWorldState();
    const config = createConsequencesConfig();
    
    // Make the reboot action not trigger a disaster by setting probability to 0
    const safeConfig = {
      ...config,
      actions: config.actions.map(a =>
        a.id === 'reboot_node' ? { ...a, disasterProbability: 0 } : a,
      ),
    };
    
    const result = executeActionPure(state, 'reboot_node', [], safeConfig);
    
    expect(result.success).toBe(true);
    expect(result.newState.slaScore).toBeLessThan(100);
  });
});

describe('ConsequencesEngine — calculateDamageReport', () => {
  it('should report zero damage for healthy state', () => {
    const state = createWorldState();
    const report = calculateDamageReport(state);
    
    expect(report.downtimeMs).toBe(0);
    expect(report.slaLoss).toBe(0);
    expect(report.dataLossPercent).toBe(0);
    expect(report.businessImpact).toContain('正常');
  });

  it('should report damage for degraded state', () => {
    const state = createWorldState({
      nodes: [
        createNode({ id: 'node-1', status: 'offline', dataIntegrity: 0.5 }),
        createNode({ id: 'node-2', status: 'normal', dataIntegrity: 1.0 }),
      ],
      slaScore: 60,
      downtimeMs: 120000,
    });
    
    const report = calculateDamageReport(state);
    
    expect(report.downtimeMs).toBe(120000);
    expect(report.slaLoss).toBe(40);
    expect(report.dataLossPercent).toBeGreaterThan(0);
    expect(report.businessImpact).toContain('不可用');
  });
});

// ─── Animation Catalog ────────────────────────────────────────────

describe('AnimationCatalog — DEFAULT_ANIMATION_CATALOG', () => {
  it('should contain node status mappings', () => {
    const nodeOffline = DEFAULT_ANIMATION_CATALOG.mappings.find(m => m.id === 'node-offline');
    expect(nodeOffline).toBeDefined();
    expect(nodeOffline!.trigger).toBe('node.status.normal→offline');
    expect(nodeOffline!.effects.length).toBeGreaterThan(0);
  });

  it('should contain network status mappings', () => {
    const linkPartitioned = DEFAULT_ANIMATION_CATALOG.mappings.find(m => m.id === 'link-partitioned');
    expect(linkPartitioned).toBeDefined();
    expect(linkPartitioned!.trigger).toContain('partitioned');
  });

  it('should contain disaster mappings', () => {
    const explosion = DEFAULT_ANIMATION_CATALOG.mappings.find(m => m.id === 'disaster-explosion');
    expect(explosion).toBeDefined();
    expect(explosion!.priority).toBeGreaterThanOrEqual(20);
  });

  it('should have at least 15 animation mappings', () => {
    expect(DEFAULT_ANIMATION_CATALOG.mappings.length).toBeGreaterThanOrEqual(15);
  });
});

describe('AnimationCatalog — findMatchingAnimations', () => {
  it('should find exact match', () => {
    const matches = findMatchingAnimations(
      DEFAULT_ANIMATION_CATALOG,
      'node.status.normal→offline',
    );
    
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe('node-offline');
  });

  it('should find wildcard match', () => {
    const matches = findMatchingAnimations(
      DEFAULT_ANIMATION_CATALOG,
      'node.status.normal→split_brain',
    );
    
    // Should match "node.status.*→split_brain"
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should return empty for unmatched trigger', () => {
    const matches = findMatchingAnimations(
      DEFAULT_ANIMATION_CATALOG,
      'nonexistent.trigger.foo→bar',
    );
    
    expect(matches).toHaveLength(0);
  });

  it('should sort by priority (highest first)', () => {
    const catalog: AnimationCatalog = {
      id: 'test',
      name: 'Test',
      mappings: [
        { id: 'low', trigger: 'test.trigger', effects: [], priority: 1, description: '' },
        { id: 'high', trigger: 'test.trigger', effects: [], priority: 10, description: '' },
        { id: 'mid', trigger: 'test.trigger', effects: [], priority: 5, description: '' },
      ],
    };
    
    const matches = findMatchingAnimations(catalog, 'test.trigger');
    
    expect(matches[0].id).toBe('high');
    expect(matches[1].id).toBe('mid');
    expect(matches[2].id).toBe('low');
  });
});

describe('AnimationCatalog — mergeAnimationCatalogs', () => {
  it('should override base mappings with same id', () => {
    const customMapping: AnimationMapping = {
      id: 'node-offline',
      trigger: 'node.status.normal→offline',
      effects: [{ type: 'explosion', color: '#ff0000', durationMs: 5000, intensity: 1, loop: false }],
      priority: 20,
      description: 'Custom vendor offline animation',
    };

    const vendorCatalog: AnimationCatalog = {
      id: 'smartx-halo',
      name: 'SmartX HALO',
      vendor: 'SmartX',
      mappings: [customMapping],
    };

    const merged = mergeAnimationCatalogs(DEFAULT_ANIMATION_CATALOG, vendorCatalog);
    
    const offlineMapping = merged.mappings.find(m => m.id === 'node-offline');
    expect(offlineMapping!.priority).toBe(20);
    expect(offlineMapping!.effects[0].type).toBe('explosion');
  });

  it('should keep base mappings not overridden', () => {
    const vendorCatalog: AnimationCatalog = {
      id: 'huawei-fc',
      name: 'Huawei FusionCompute',
      vendor: 'Huawei',
      mappings: [],
    };

    const merged = mergeAnimationCatalogs(DEFAULT_ANIMATION_CATALOG, vendorCatalog);
    
    expect(merged.mappings.length).toBe(DEFAULT_ANIMATION_CATALOG.mappings.length);
  });

  it('should use override catalog metadata', () => {
    const vendorCatalog: AnimationCatalog = {
      id: 'vmware-vsphere',
      name: 'VMware vSphere',
      vendor: 'VMware',
      mappings: [],
    };

    const merged = mergeAnimationCatalogs(DEFAULT_ANIMATION_CATALOG, vendorCatalog);
    
    expect(merged.id).toBe('vmware-vsphere');
    expect(merged.vendor).toBe('VMware');
  });
});

// ─── Visual Bridge ────────────────────────────────────────────────

describe('VisualBridge — detectChanges', () => {
  it('should detect node status change', () => {
    const prevNodes = [createNode({ id: 'n1', status: 'normal' })];
    const nextNodes = [createNode({ id: 'n1', status: 'offline' })];
    
    const changes = detectChanges(prevNodes, [], nextNodes, []);
    
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('node');
    expect(changes[0].trigger).toBe('node.status.normal→offline');
  });

  it('should detect link status change', () => {
    const prevLinks = [createLink({ id: 'l1', status: 'connected' })];
    const nextLinks = [createLink({ id: 'l1', status: 'partitioned' })];
    
    const changes = detectChanges([], prevLinks, [], nextLinks);
    
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('link');
    expect(changes[0].trigger).toBe('link.status.connected→partitioned');
  });

  it('should detect high load threshold', () => {
    const prevNodes = [createNode({ id: 'n1', load: 0.5 })];
    const nextNodes = [createNode({ id: 'n1', load: 0.95 })];
    
    const changes = detectChanges(prevNodes, [], nextNodes, []);
    
    expect(changes.some(c => c.trigger === 'node.load.threshold_high')).toBe(true);
  });

  it('should detect low data integrity', () => {
    const prevNodes = [createNode({ id: 'n1', dataIntegrity: 1.0 })];
    const nextNodes = [createNode({ id: 'n1', dataIntegrity: 0.3 })];
    
    const changes = detectChanges(prevNodes, [], nextNodes, []);
    
    expect(changes.some(c => c.trigger === 'node.dataIntegrity.threshold_low')).toBe(true);
  });

  it('should return empty for no changes', () => {
    const nodes = [createNode({ id: 'n1' })];
    const links = [createLink({ id: 'l1' })];
    
    const changes = detectChanges(nodes, links, nodes, links);
    
    expect(changes).toHaveLength(0);
  });
});

describe('VisualBridge — applyWorldStateChanges', () => {
  it('should update entity style for node offline', () => {
    const scene = createScene();
    const changes = [{
      type: 'node' as const,
      id: 'node-1',
      field: 'status',
      oldValue: 'normal',
      newValue: 'offline',
      trigger: 'node.status.normal→offline',
    }];
    
    const result = applyWorldStateChanges(scene, changes, DEFAULT_ANIMATION_CATALOG);
    
    const entity = result.scene.entities.find(e => e.id === 'node-1');
    expect(entity!.style.stroke).toBe('#ef4444'); // red for offline
    expect(entity!.style.opacity).toBe(0.5);
  });

  it('should produce pending animations for changes', () => {
    const scene = createScene();
    const changes = [{
      type: 'node' as const,
      id: 'node-1',
      field: 'status',
      oldValue: 'normal',
      newValue: 'offline',
      trigger: 'node.status.normal→offline',
    }];
    
    const result = applyWorldStateChanges(scene, changes, DEFAULT_ANIMATION_CATALOG);
    
    expect(result.animations.length).toBeGreaterThan(0);
    expect(result.animations[0].entityId).toBe('node-1');
    expect(result.animations[0].effects.length).toBeGreaterThan(0);
  });

  it('should update connection style for link partitioned', () => {
    const scene = createScene();
    const changes = [{
      type: 'link' as const,
      id: 'link-1-2',
      field: 'status',
      oldValue: 'connected',
      newValue: 'partitioned',
      trigger: 'link.status.connected→partitioned',
    }];
    
    const result = applyWorldStateChanges(scene, changes, DEFAULT_ANIMATION_CATALOG);
    
    const conn = result.scene.connections.find(c => c.id === 'link-1-2');
    expect(conn!.style.color).toBe('#ef4444');
    expect(conn!.style.opacity).toBe(0.4);
  });

  it('should handle empty changes', () => {
    const scene = createScene();
    const result = applyWorldStateChanges(scene, [], DEFAULT_ANIMATION_CATALOG);
    
    expect(result.scene).toEqual(scene);
    expect(result.animations).toHaveLength(0);
  });
});
