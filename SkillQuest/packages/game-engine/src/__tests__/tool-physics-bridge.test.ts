/**
 * ToolSystem + PhysicsEngine + ToolVisualBridge Tests
 *
 * 测试硬核仿真交互系统的三大核心模块:
 * 1. ToolSystem: 工具状态管理, 冷却, 操作序列验证
 * 2. PhysicsEngine: 粒子物理 tick, 颜色插值, 冻结/震动
 * 3. ToolVisualBridge: 工具动作 → 视觉效果映射
 * 4. ZBS Replica Scenario: 场景配置正确性
 */

import { describe, it, expect } from 'vitest';

// ─── ToolSystem imports ────────────────────────────────────────────
import {
  createToolState,
  createAllToolStates,
  canUseTool,
  activateTool,
  tickToolCooldown,
  tickAllCooldowns,
  executeProbe,
  executeCutter,
  executeBooster,
  executeLinker,
  executeMigrator,
  executeFreezer,
  executeToolAction,
  createSequenceTracker,
  validateSequenceAction,
} from '../tool-system';
import type { ToolConfig } from '../tool-system';

// ─── PhysicsEngine imports ─────────────────────────────────────────
import {
  loadToColor,
  heatToColor,
  createParticlePhysics,
  createNodePhysics,
  createPhysicsState,
  tickNodePhysics,
  tickParticlePhysics,
  tickPhysics,
  toggleFreeze,
  triggerScreenShake,
  triggerNodeShake,
  toggleXRay,
} from '../physics-engine';

// ─── ToolVisualBridge imports ──────────────────────────────────────
import {
  applyToolActionToVisuals,
  boostConnectionParticles,
} from '../tool-visual-bridge';

// ─── ZBS Scenario imports ──────────────────────────────────────────
import {
  ZBS_REPLICA_NODES,
  ZBS_REPLICA_LINKS,
  ZBS_REPLICA_CONSEQUENCES,
  ZBS_REPLICA_TOOL_SEQUENCE,
} from '../scenarios/zbs-replica-rescue';

// ─── Types ─────────────────────────────────────────────────────────
import type {
  ToolType,
  ToolState,
  ToolAction,
  ToolSequence,
  WorldNode,
  WorldLink,
  PhysicsState,
  ParticlePhysics,
  NodePhysics,
} from '@skillquest/types';
import type { VisualScene, VisualConnection } from '../visual-scene';
import { defaultFeedback, defaultViewport } from '../visual-scene';

// ═══════════════════════════════════════════════════════════════════
// ToolSystem Tests
// ═══════════════════════════════════════════════════════════════════

describe('ToolSystem', () => {
  // ─── Tool State ──────────────────────────────────────────────────

  describe('createToolState', () => {
    it('creates idle tool with correct defaults', () => {
      const config: ToolConfig = { type: 'probe', cooldownMs: 1000, maxUsage: -1 };
      const state = createToolState(config);

      expect(state.type).toBe('probe');
      expect(state.status).toBe('idle');
      expect(state.cooldownRemainingMs).toBe(0);
      expect(state.cooldownTotalMs).toBe(1000);
      expect(state.usageCount).toBe(0);
      expect(state.maxUsage).toBe(-1);
    });
  });

  describe('createAllToolStates', () => {
    it('creates all 6 tools with default configs', () => {
      const tools = createAllToolStates();
      expect(tools).toHaveLength(6);
      const types = tools.map((t: ToolState) => t.type);
      expect(types).toContain('probe');
      expect(types).toContain('cutter');
      expect(types).toContain('booster');
      expect(types).toContain('linker');
      expect(types).toContain('migrator');
      expect(types).toContain('freezer');
    });

    it('all tools start idle', () => {
      const tools = createAllToolStates();
      for (const tool of tools) {
        expect(tool.status).toBe('idle');
      }
    });
  });

  // ─── Tool Usage ──────────────────────────────────────────────────

  describe('canUseTool', () => {
    it('returns true for idle tool with unlimited usage', () => {
      const tool = createToolState({ type: 'probe', cooldownMs: 1000, maxUsage: -1 });
      expect(canUseTool(tool)).toBe(true);
    });

    it('returns false for tool in cooldown', () => {
      const tool = createToolState({ type: 'probe', cooldownMs: 1000, maxUsage: -1 });
      const activated = activateTool(tool);
      expect(canUseTool(activated)).toBe(false);
    });

    it('returns false for tool that exceeded max usage', () => {
      const tool: ToolState = {
        type: 'cutter',
        status: 'idle',
        cooldownRemainingMs: 0,
        cooldownTotalMs: 3000,
        usageCount: 3,
        maxUsage: 3,
      };
      expect(canUseTool(tool)).toBe(false);
    });
  });

  describe('activateTool', () => {
    it('transitions to cooldown and increments usage', () => {
      const tool = createToolState({ type: 'cutter', cooldownMs: 3000, maxUsage: 3 });
      const activated = activateTool(tool);

      expect(activated.status).toBe('cooldown');
      expect(activated.cooldownRemainingMs).toBe(3000);
      expect(activated.usageCount).toBe(1);
    });

    it('does not activate unavailable tool', () => {
      const tool: ToolState = {
        type: 'cutter',
        status: 'cooldown',
        cooldownRemainingMs: 2000,
        cooldownTotalMs: 3000,
        usageCount: 1,
        maxUsage: 3,
      };
      const result = activateTool(tool);
      expect(result).toBe(tool); // unchanged
    });
  });

  // ─── Cooldown Tick ───────────────────────────────────────────────

  describe('tickToolCooldown', () => {
    it('reduces cooldown time', () => {
      const tool = activateTool(createToolState({ type: 'probe', cooldownMs: 1000, maxUsage: -1 }));
      const ticked = tickToolCooldown(tool, 300);
      expect(ticked.cooldownRemainingMs).toBe(700);
      expect(ticked.status).toBe('cooldown');
    });

    it('transitions to idle when cooldown completes', () => {
      const tool = activateTool(createToolState({ type: 'probe', cooldownMs: 1000, maxUsage: -1 }));
      const ticked = tickToolCooldown(tool, 1000);
      expect(ticked.status).toBe('idle');
      expect(ticked.cooldownRemainingMs).toBe(0);
    });

    it('transitions to disabled when max usage reached', () => {
      const tool: ToolState = {
        type: 'freezer',
        status: 'cooldown',
        cooldownRemainingMs: 100,
        cooldownTotalMs: 10000,
        usageCount: 1,
        maxUsage: 1,
      };
      const ticked = tickToolCooldown(tool, 200);
      expect(ticked.status).toBe('disabled');
    });

    it('does not change idle tools', () => {
      const tool = createToolState({ type: 'probe', cooldownMs: 1000, maxUsage: -1 });
      const ticked = tickToolCooldown(tool, 500);
      expect(ticked).toBe(tool);
    });
  });

  describe('tickAllCooldowns', () => {
    it('ticks all tools simultaneously', () => {
      const tools = createAllToolStates();
      // Activate probe and cutter
      tools[0] = activateTool(tools[0]);
      tools[1] = activateTool(tools[1]);

      const ticked = tickAllCooldowns(tools, 500);
      expect(ticked[0].cooldownRemainingMs).toBe(500); // probe: 1000 - 500
      expect(ticked[1].cooldownRemainingMs).toBe(2500); // cutter: 3000 - 500
      expect(ticked[2].status).toBe('idle'); // booster: unchanged
    });
  });

  // ─── Tool Execution ──────────────────────────────────────────────

  describe('executeProbe', () => {
    it('generates probe data based on node state', () => {
      const node: WorldNode = {
        id: 'node-b',
        label: 'Node B',
        category: 'storage',
        status: 'normal',
        load: 0.5,
        ioLatencyMs: 10,
        dataIntegrity: 1.0,
        metrics: {},
      };

      const data = executeProbe(node, 42);
      expect(data.nodeId).toBe('node-b');
      expect(data.ioDepth).toBe(64); // 0.5 * 128
      expect(data.latencySamples).toHaveLength(10);
      expect(data.iops).toBeGreaterThan(0);
      expect(data.throughputMBps).toBeGreaterThan(0);
    });

    it('produces deterministic results with same seed', () => {
      const node: WorldNode = {
        id: 'test', label: 'Test', category: 'storage',
        status: 'normal', load: 0.3, ioLatencyMs: 5,
        dataIntegrity: 1.0, metrics: {},
      };

      const data1 = executeProbe(node, 123);
      const data2 = executeProbe(node, 123);
      expect(data1.latencySamples).toEqual(data2.latencySamples);
      expect(data1.ioDepth).toBe(data2.ioDepth);
    });
  });

  describe('executeCutter', () => {
    it('returns partition mutation and visual triggers', () => {
      const result = executeCutter('link-a-b');
      expect(result.success).toBe(true);
      expect(result.mutations).toHaveLength(1);
      expect(result.mutations[0].value).toBe('partitioned');
      expect(result.visualTriggers).toContain('tool.cutter.activate');
    });
  });

  describe('executeBooster', () => {
    it('increases node load', () => {
      const node: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.5, ioLatencyMs: 10,
        dataIntegrity: 1.0, metrics: {},
      };

      const result = executeBooster(node);
      expect(result.success).toBe(true);
      expect(result.mutations.find((m: { field: string }) => m.field === 'load')?.value).toBe(0.8);
    });

    it('triggers overload when load exceeds 0.9', () => {
      const node: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.7, ioLatencyMs: 10,
        dataIntegrity: 1.0, metrics: {},
      };

      const result = executeBooster(node);
      expect(result.mutations.find((m: { field: string }) => m.field === 'load')?.value).toBe(1.0);
      expect(result.visualTriggers).toContain('node.status.normal→overloaded');
    });
  });

  describe('executeLinker', () => {
    it('returns connected mutation', () => {
      const result = executeLinker('nodeA', 'nodeB');
      expect(result.success).toBe(true);
      expect(result.mutations[0].value).toBe('connected');
      expect(result.visualTriggers).toContain('tool.linker.activate');
    });
  });

  describe('executeMigrator', () => {
    it('adjusts load on source and target', () => {
      const result = executeMigrator('source', 'target');
      expect(result.success).toBe(true);
      expect(result.mutations).toHaveLength(2);
      expect(result.visualTriggers).toContain('node.action.migrate');
    });
  });

  describe('executeFreezer', () => {
    it('returns freeze trigger with no mutations', () => {
      const result = executeFreezer();
      expect(result.success).toBe(true);
      expect(result.mutations).toHaveLength(0);
      expect(result.visualTriggers).toContain('tool.freezer.activate');
    });
  });

  describe('executeToolAction', () => {
    const testNodes: WorldNode[] = [
      {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.4, ioLatencyMs: 5,
        dataIntegrity: 1.0, metrics: {},
      },
    ];
    const testLinks: WorldLink[] = [];

    it('dispatches probe action correctly', () => {
      const action: ToolAction = {
        id: 'a1', tool: 'probe', targetId: 'n1', timestamp: 1000,
      };
      const result = executeToolAction(action, testNodes, testLinks, 42);
      expect(result.success).toBe(true);
      expect(result.probeData).toBeDefined();
      expect(result.probeData!.nodeId).toBe('n1');
    });

    it('returns failure for probe on missing node', () => {
      const action: ToolAction = {
        id: 'a2', tool: 'probe', targetId: 'missing', timestamp: 1000,
      };
      const result = executeToolAction(action, testNodes, testLinks);
      expect(result.success).toBe(false);
    });

    it('dispatches freezer action', () => {
      const action: ToolAction = {
        id: 'a3', tool: 'freezer', targetId: '', timestamp: 1000,
      };
      const result = executeToolAction(action, testNodes, testLinks);
      expect(result.success).toBe(true);
    });
  });

  // ─── Sequence Validation ─────────────────────────────────────────

  describe('SequenceTracker', () => {
    const testSequence: ToolSequence = {
      id: 'test-seq',
      description: 'Test sequence',
      requiredSteps: [
        { index: 0, requiredTool: 'probe', requiredTargetId: 'meta', hint: 'Step 1' },
        { index: 1, requiredTool: 'booster', requiredTargetId: 'node-b', hint: 'Step 2' },
        { index: 2, requiredTool: 'linker', requiredTargetId: null, hint: 'Step 3' },
      ],
      maxIntervalMs: 3000,
      timeLimitMs: 15000,
    };

    it('tracks correct sequence', () => {
      let tracker = createSequenceTracker(testSequence, 1000);

      const action1: ToolAction = { id: 'a1', tool: 'probe', targetId: 'meta', timestamp: 2000 };
      const r1 = validateSequenceAction(tracker, action1);
      tracker = r1.tracker;
      expect(r1.result.currentStep).toBe(1);
      expect(r1.result.hasMistake).toBe(false);

      const action2: ToolAction = { id: 'a2', tool: 'booster', targetId: 'node-b', timestamp: 3000 };
      const r2 = validateSequenceAction(tracker, action2);
      tracker = r2.tracker;
      expect(r2.result.currentStep).toBe(2);

      const action3: ToolAction = { id: 'a3', tool: 'linker', targetId: 'any-target', timestamp: 4000 };
      const r3 = validateSequenceAction(tracker, action3);
      expect(r3.result.completed).toBe(true);
      expect(r3.result.hasMistake).toBe(false);
    });

    it('detects wrong tool type', () => {
      const tracker = createSequenceTracker(testSequence, 1000);
      const action: ToolAction = { id: 'a1', tool: 'cutter', targetId: 'meta', timestamp: 2000 };
      const result = validateSequenceAction(tracker, action);

      expect(result.result.hasMistake).toBe(true);
      expect(result.result.mistakeReason).toContain('probe');
      expect(result.result.mistakeReason).toContain('cutter');
    });

    it('detects wrong target', () => {
      const tracker = createSequenceTracker(testSequence, 1000);
      const action: ToolAction = { id: 'a1', tool: 'probe', targetId: 'wrong-node', timestamp: 2000 };
      const result = validateSequenceAction(tracker, action);

      expect(result.result.hasMistake).toBe(true);
      expect(result.result.mistakeReason).toContain('meta');
    });

    it('detects timeout', () => {
      const tracker = createSequenceTracker(testSequence, 1000);
      const action: ToolAction = { id: 'a1', tool: 'probe', targetId: 'meta', timestamp: 20000 };
      const result = validateSequenceAction(tracker, action);

      expect(result.result.hasMistake).toBe(true);
      expect(result.result.mistakeReason).toContain('超时');
    });

    it('detects interval exceeded', () => {
      let tracker = createSequenceTracker(testSequence, 1000);

      const action1: ToolAction = { id: 'a1', tool: 'probe', targetId: 'meta', timestamp: 2000 };
      const r1 = validateSequenceAction(tracker, action1);
      tracker = r1.tracker;

      // 5 seconds later (exceeds 3s max interval)
      const action2: ToolAction = { id: 'a2', tool: 'booster', targetId: 'node-b', timestamp: 7001 };
      const r2 = validateSequenceAction(tracker, action2);
      expect(r2.result.hasMistake).toBe(true);
      expect(r2.result.mistakeReason).toContain('间隔');
    });

    it('allows null target (any target accepted)', () => {
      let tracker = createSequenceTracker(testSequence, 1000);

      const a1: ToolAction = { id: 'a1', tool: 'probe', targetId: 'meta', timestamp: 2000 };
      tracker = validateSequenceAction(tracker, a1).tracker;

      const a2: ToolAction = { id: 'a2', tool: 'booster', targetId: 'node-b', timestamp: 3000 };
      tracker = validateSequenceAction(tracker, a2).tracker;

      // Step 3 has requiredTargetId: null, so any target should work
      const a3: ToolAction = { id: 'a3', tool: 'linker', targetId: 'anything', timestamp: 4000 };
      const r3 = validateSequenceAction(tracker, a3);
      expect(r3.result.completed).toBe(true);
      expect(r3.result.hasMistake).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PhysicsEngine Tests
// ═══════════════════════════════════════════════════════════════════

describe('PhysicsEngine', () => {
  // ─── Color Functions ─────────────────────────────────────────────

  describe('loadToColor', () => {
    it('returns blue-ish for low load', () => {
      const color = loadToColor(0);
      expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
      // Low load should have high blue component
      const [, , b] = color.match(/rgb\((\d+),(\d+),(\d+)\)/)!.slice(1).map(Number);
      expect(b).toBeGreaterThan(200);
    });

    it('returns red-ish for high load', () => {
      const color = loadToColor(1);
      const [r, , b] = color.match(/rgb\((\d+),(\d+),(\d+)\)/)!.slice(1).map(Number);
      expect(r).toBeGreaterThan(200);
      expect(b).toBeLessThan(150);
    });

    it('clamps values outside 0-1', () => {
      const colorLow = loadToColor(-0.5);
      const colorZero = loadToColor(0);
      expect(colorLow).toBe(colorZero);

      const colorHigh = loadToColor(1.5);
      const colorOne = loadToColor(1);
      expect(colorHigh).toBe(colorOne);
    });
  });

  describe('heatToColor', () => {
    it('returns valid RGB for all heat values', () => {
      for (let h = 0; h <= 1; h += 0.1) {
        const color = heatToColor(h);
        expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
      }
    });
  });

  // ─── State Creation ──────────────────────────────────────────────

  describe('createPhysicsState', () => {
    it('creates state with correct number of particles and nodes', () => {
      const state = createPhysicsState(['c1', 'c2'], ['n1', 'n2', 'n3']);
      expect(state.particles).toHaveLength(2);
      expect(state.nodes).toHaveLength(3);
      expect(state.globalFrozen).toBe(false);
      expect(state.xrayMode).toBe(false);
    });

    it('particles start with base values', () => {
      const state = createPhysicsState(['c1'], ['n1']);
      const p = state.particles[0];
      expect(p.connectionId).toBe('c1');
      expect(p.density).toBe(5);
      expect(p.velocity).toBe(80);
      expect(p.viscosity).toBe(0);
      expect(p.frozen).toBe(false);
    });

    it('nodes start with zero phase and normal breath', () => {
      const state = createPhysicsState([], ['n1']);
      const n = state.nodes[0];
      expect(n.nodeId).toBe('n1');
      expect(n.breathPhase).toBe(0);
      expect(n.breathFrequency).toBe(0.5);
      expect(n.heatValue).toBe(0);
      expect(n.shakeIntensity).toBe(0);
    });
  });

  // ─── Node Physics Tick ───────────────────────────────────────────

  describe('tickNodePhysics', () => {
    it('advances breath phase over time', () => {
      const node = createNodePhysics('n1');
      const worldNode: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.3, ioLatencyMs: 5,
        dataIntegrity: 1.0, metrics: {},
      };
      const ticked = tickNodePhysics(node, worldNode, 1000);
      expect(ticked.breathPhase).toBeGreaterThan(0);
    });

    it('increases breath frequency under high load', () => {
      const node = createNodePhysics('n1');
      const worldNode: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'overloaded', load: 0.9, ioLatencyMs: 50,
        dataIntegrity: 0.8, metrics: {},
      };
      const ticked = tickNodePhysics(node, worldNode, 1000);
      expect(ticked.breathFrequency).toBeGreaterThan(0.5);
    });

    it('maps heat value from node load', () => {
      const node = createNodePhysics('n1');
      const worldNode: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.7, ioLatencyMs: 10,
        dataIntegrity: 1.0, metrics: {},
      };
      const ticked = tickNodePhysics(node, worldNode, 100);
      expect(ticked.heatValue).toBe(0.7);
    });

    it('decays shake intensity over time', () => {
      const node: NodePhysics = {
        ...createNodePhysics('n1'),
        shakeIntensity: 1.0,
        shakeDamping: 2.0,
      };
      const ticked = tickNodePhysics(node, undefined, 500);
      expect(ticked.shakeIntensity).toBe(0); // 1.0 - 2.0*0.5 = 0 (clamped)
    });
  });

  // ─── Particle Physics Tick ───────────────────────────────────────

  describe('tickParticlePhysics', () => {
    it('increases density under high node load', () => {
      const particle = createParticlePhysics('c1');
      const highLoadNode: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'overloaded', load: 0.9, ioLatencyMs: 5,
        dataIntegrity: 0.8, metrics: {},
      };
      const ticked = tickParticlePhysics(particle, highLoadNode, highLoadNode, undefined, false);
      expect(ticked.density).toBeGreaterThan(5);
    });

    it('increases viscosity under high latency', () => {
      const particle = createParticlePhysics('c1');
      const highLatencyNode: WorldNode = {
        id: 'n1', label: 'N1', category: 'storage',
        status: 'degraded', load: 0.3, ioLatencyMs: 100,
        dataIntegrity: 0.9, metrics: {},
      };
      const ticked = tickParticlePhysics(particle, highLatencyNode, highLatencyNode, undefined, false);
      expect(ticked.viscosity).toBeGreaterThan(0);
      expect(ticked.size).toBeGreaterThan(3); // larger = more viscous
    });

    it('freezes when global freeze is active', () => {
      const particle = createParticlePhysics('c1');
      const ticked = tickParticlePhysics(particle, undefined, undefined, undefined, true);
      expect(ticked.frozen).toBe(true);
    });
  });

  // ─── Global Physics Tick ─────────────────────────────────────────

  describe('tickPhysics', () => {
    it('updates all nodes and particles in one tick', () => {
      const state = createPhysicsState(['c1'], ['n1']);
      const worldNodes: WorldNode[] = [{
        id: 'n1', label: 'N1', category: 'storage',
        status: 'normal', load: 0.5, ioLatencyMs: 10,
        dataIntegrity: 1.0, metrics: {},
      }];
      const worldLinks: WorldLink[] = [{
        id: 'c1', fromNodeId: 'n1', toNodeId: 'n1',
        status: 'connected', bandwidthUsage: 0.5, latencyMs: 5,
      }];

      const ticked = tickPhysics(state, {
        deltaMs: 100,
        worldNodes,
        worldLinks,
      });

      expect(ticked.nodes[0].breathPhase).toBeGreaterThan(0);
      expect(ticked.particles[0].density).not.toBe(state.particles[0].density);
    });

    it('decays screen shake over time', () => {
      let state = createPhysicsState([], []);
      state = triggerScreenShake(state, 1.0, 1000);

      const ticked = tickPhysics(state, {
        deltaMs: 500,
        worldNodes: [],
        worldLinks: [],
      });

      expect(ticked.screenShake.remainingMs).toBe(500);
      expect(ticked.screenShake.intensity).toBeLessThan(1.0);
      expect(ticked.screenShake.intensity).toBeGreaterThan(0);
    });
  });

  // ─── Toggle Functions ────────────────────────────────────────────

  describe('toggleFreeze', () => {
    it('freezes all particles', () => {
      const state = createPhysicsState(['c1', 'c2'], ['n1']);
      const frozen = toggleFreeze(state);
      expect(frozen.globalFrozen).toBe(true);
      expect(frozen.particles.every((p: ParticlePhysics) => p.frozen)).toBe(true);
    });

    it('unfreezes on second toggle', () => {
      const state = createPhysicsState(['c1'], ['n1']);
      const frozen = toggleFreeze(state);
      const unfrozen = toggleFreeze(frozen);
      expect(unfrozen.globalFrozen).toBe(false);
      expect(unfrozen.particles.every((p: ParticlePhysics) => !p.frozen)).toBe(true);
    });
  });

  describe('triggerScreenShake', () => {
    it('sets shake intensity and duration', () => {
      const state = createPhysicsState([], []);
      const shaken = triggerScreenShake(state, 0.8, 500);
      expect(shaken.screenShake.intensity).toBe(0.8);
      expect(shaken.screenShake.remainingMs).toBe(500);
    });
  });

  describe('triggerNodeShake', () => {
    it('sets shake on specific node', () => {
      const state = createPhysicsState([], ['n1', 'n2']);
      const shaken = triggerNodeShake(state, 'n1', 0.9);
      expect(shaken.nodes[0].shakeIntensity).toBe(0.9);
      expect(shaken.nodes[1].shakeIntensity).toBe(0); // unaffected
    });
  });

  describe('toggleXRay', () => {
    it('toggles xray mode', () => {
      const state = createPhysicsState([], []);
      expect(state.xrayMode).toBe(false);
      const toggled = toggleXRay(state);
      expect(toggled.xrayMode).toBe(true);
      const back = toggleXRay(toggled);
      expect(back.xrayMode).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// ToolVisualBridge Tests
// ═══════════════════════════════════════════════════════════════════

describe('ToolVisualBridge', () => {
  function createTestScene(): VisualScene {
    return {
      id: 'test-scene',
      title: 'Test Scene',
      sourceType: 'test',
      entities: [],
      connections: [
        {
          id: 'c1',
          from: 'n1',
          to: 'n2',
          style: { color: '#22c55e', width: 2, opacity: 0.8 },
          particleConfig: {
            enabled: true, color: '#FFD700', speed: 80,
            size: 3, density: 5, trailLength: 6, shape: 'circle' as const,
          },
          bidirectional: false,
        },
      ],
      interactions: [],
      feedback: defaultFeedback(),
      viewport: defaultViewport(),
    };
  }

  describe('applyToolActionToVisuals', () => {
    it('applies cutter visual effects', () => {
      const scene = createTestScene();
      const physics = createPhysicsState(['c1'], ['n1', 'n2']);
      const action: ToolAction = { id: 'a1', tool: 'cutter', targetId: 'c1', timestamp: 1000 };
      const result = {
        success: true,
        message: 'Cut',
        mutations: [],
        visualTriggers: ['tool.cutter.activate'],
      };

      const update = applyToolActionToVisuals(action, result, physics, scene);

      // Particles on c1 should be stopped
      const p = update.physicsState.particles.find((pp: ParticlePhysics) => pp.connectionId === 'c1');
      expect(p?.density).toBe(0);
      expect(p?.frozen).toBe(true);

      // Connection style should show breakage
      const conn = update.sceneUpdates.connections?.find((c: VisualConnection) => c.id === 'c1');
      expect(conn?.style.color).toBe('#ef4444');
      expect(conn?.particleConfig.enabled).toBe(false);
    });

    it('applies booster screen shake', () => {
      const scene = createTestScene();
      const physics = createPhysicsState([], ['n1']);
      const action: ToolAction = { id: 'a1', tool: 'booster', targetId: 'n1', timestamp: 1000 };
      const result = {
        success: true, message: 'Boosted',
        mutations: [], visualTriggers: ['tool.booster.activate'],
      };

      const update = applyToolActionToVisuals(action, result, physics, scene);
      expect(update.physicsState.screenShake.intensity).toBeGreaterThan(0);
      expect(update.physicsState.nodes[0].shakeIntensity).toBeGreaterThan(0);
    });

    it('applies freezer toggle', () => {
      const scene = createTestScene();
      const physics = createPhysicsState(['c1'], ['n1']);
      const action: ToolAction = { id: 'a1', tool: 'freezer', targetId: '', timestamp: 1000 };
      const result = {
        success: true, message: 'Frozen',
        mutations: [], visualTriggers: ['tool.freezer.activate'],
      };

      const update = applyToolActionToVisuals(action, result, physics, scene);
      expect(update.physicsState.globalFrozen).toBe(true);
    });

    it('collects animations from visual triggers', () => {
      const scene = createTestScene();
      const physics = createPhysicsState([], []);
      const action: ToolAction = { id: 'a1', tool: 'probe', targetId: 'n1', timestamp: 1000 };
      const result = {
        success: true, message: 'Probed',
        mutations: [], visualTriggers: ['tool.probe.activate'],
      };

      const update = applyToolActionToVisuals(action, result, physics, scene);
      expect(update.animations.length).toBeGreaterThan(0);
      expect(update.animations[0].entityId).toBe('n1');
    });
  });

  describe('boostConnectionParticles', () => {
    it('increases particle parameters with boost level', () => {
      const conn: VisualConnection = {
        id: 'c1', from: 'n1', to: 'n2',
        style: { color: '#22c55e', width: 2, opacity: 0.8 },
        particleConfig: {
          enabled: true, color: '#FFD700', speed: 80,
          size: 3, density: 5, trailLength: 6, shape: 'circle',
        },
        bidirectional: false,
      };

      const boosted = boostConnectionParticles(conn, 0.8);
      expect(boosted.density).toBeGreaterThan(5);
      expect(boosted.speed).toBeGreaterThan(80);
      expect(boosted.size).toBeGreaterThan(3);
      expect(boosted.color).toBe('#ef4444'); // high boost = red
    });

    it('keeps original color for low boost', () => {
      const conn: VisualConnection = {
        id: 'c1', from: 'n1', to: 'n2',
        style: { color: '#22c55e', width: 2, opacity: 0.8 },
        particleConfig: {
          enabled: true, color: '#FFD700', speed: 80,
          size: 3, density: 5, trailLength: 6, shape: 'circle',
        },
        bidirectional: false,
      };

      const boosted = boostConnectionParticles(conn, 0.2);
      expect(boosted.color).toBe('#FFD700'); // low boost = original
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// ZBS Replica Rescue Scenario Tests
// ═══════════════════════════════════════════════════════════════════

describe('ZBS Replica Rescue Scenario', () => {
  it('has 5 nodes (3 storage + meta + access)', () => {
    expect(ZBS_REPLICA_NODES).toHaveLength(5);
    const categories = ZBS_REPLICA_NODES.map((n: WorldNode) => n.category);
    expect(categories.filter((c: string) => c === 'storage-node')).toHaveLength(3);
    expect(categories).toContain('metadata-service');
    expect(categories).toContain('access-service');
  });

  it('node A starts offline', () => {
    const nodeA = ZBS_REPLICA_NODES.find((n: WorldNode) => n.id === 'node-a');
    expect(nodeA?.status).toBe('offline');
    expect(nodeA?.dataIntegrity).toBeLessThan(0.5);
  });

  it('has 5 links', () => {
    expect(ZBS_REPLICA_LINKS).toHaveLength(5);
  });

  it('link to node-a is disconnected', () => {
    const linkToA = ZBS_REPLICA_LINKS.find((l: WorldLink) => l.id === 'link-meta-a');
    expect(linkToA?.status).toBe('disconnected');
  });

  it('consequences has 6 actions', () => {
    expect(ZBS_REPLICA_CONSEQUENCES.actions).toHaveLength(6);
  });

  it('consequences has split-brain disaster', () => {
    const splitBrain = ZBS_REPLICA_CONSEQUENCES.disasters.find(
      (d: { id: string }) => d.id === 'split-brain',
    );
    expect(splitBrain).toBeDefined();
    expect(splitBrain?.severity).toBe('catastrophic');
  });

  it('optimal path has 5 steps', () => {
    expect(ZBS_REPLICA_CONSEQUENCES.optimalPath).toHaveLength(5);
    expect(ZBS_REPLICA_CONSEQUENCES.optimalPath[0]).toBe('probe-meta');
  });

  it('tool sequence has 4 steps', () => {
    expect(ZBS_REPLICA_TOOL_SEQUENCE.requiredSteps).toHaveLength(4);
  });

  it('tool sequence starts with probe', () => {
    expect(ZBS_REPLICA_TOOL_SEQUENCE.requiredSteps[0].requiredTool).toBe('probe');
  });

  it('tool sequence ends with linker', () => {
    const lastStep = ZBS_REPLICA_TOOL_SEQUENCE.requiredSteps[3];
    expect(lastStep.requiredTool).toBe('linker');
  });

  it('force-rebalance has high disaster probability', () => {
    const forceRebalance = ZBS_REPLICA_CONSEQUENCES.actions.find(
      (a: { id: string }) => a.id === 'force-rebalance',
    );
    expect(forceRebalance?.disasterProbability).toBeGreaterThan(0.5);
    expect(forceRebalance?.isOptimal).toBe(false);
  });

  it('tool sequence completes with correct actions', () => {
    let tracker = createSequenceTracker(ZBS_REPLICA_TOOL_SEQUENCE, 0);

    const actions: ToolAction[] = [
      { id: 'a1', tool: 'probe', targetId: 'meta-leader', timestamp: 1000 },
      { id: 'a2', tool: 'booster', targetId: 'node-b', timestamp: 3000 },
      { id: 'a3', tool: 'booster', targetId: 'node-c', timestamp: 5000 },
      { id: 'a4', tool: 'linker', targetId: 'meta-leader', timestamp: 7000 },
    ];

    for (const action of actions) {
      const { tracker: t } = validateSequenceAction(tracker, action);
      tracker = t;
    }

    expect(tracker.currentStepIndex).toBe(4);
    expect(tracker.failed).toBe(false);
  });
});
