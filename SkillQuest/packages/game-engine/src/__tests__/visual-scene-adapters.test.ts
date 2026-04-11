/**
 * VisualScene protocol + adapter tests
 *
 * Verifies that each adapter produces valid VisualScene output
 * from its respective input type.
 */

import { describe, it, expect } from 'vitest';
import type {
  TopologyQuizLevel,
  MatchingQuestion,
  OrderingQuestion,
  QuizQuestion,
  TerminalQuizLevel,
  ScenarioQuizLevel,
  VirtualizationLevel,
  LevelMapData,
} from '@skillquest/types';

import {
  topologyAdapter,
  activatePacketFlow,
  matchingAdapter,
  orderingAdapter,
  activateOrderFlow,
  quizAdapter,
  highlightCorrectOption,
  terminalAdapter,
  activateTerminalFlow,
  scenarioAdapter,
  highlightOptimalPath,
  vmPlacementAdapter,
  mapAdapter,
} from '../adapters';

import type { VisualScene } from '../visual-scene';

// ─── Shared assertion helpers ──────────────────────────────────────

function assertValidScene(scene: VisualScene) {
  expect(scene.id).toBeTruthy();
  expect(scene.sourceType).toBeTruthy();
  expect(scene.entities).toBeInstanceOf(Array);
  expect(scene.connections).toBeInstanceOf(Array);
  expect(scene.interactions).toBeInstanceOf(Array);
  expect(scene.feedback).toBeDefined();
  expect(scene.feedback.correctEffect.count).toBeGreaterThan(0);
  expect(scene.feedback.wrongEffect.duration).toBeGreaterThan(0);
  expect(scene.viewport.width).toBeGreaterThan(0);
  expect(scene.viewport.height).toBeGreaterThan(0);

  // Every entity must have required fields
  for (const entity of scene.entities) {
    expect(entity.id).toBeTruthy();
    expect(entity.type).toBeTruthy();
    expect(entity.position).toBeDefined();
    expect(entity.size.w).toBeGreaterThan(0);
    expect(entity.size.h).toBeGreaterThan(0);
    expect(entity.style).toBeDefined();
  }

  // Every connection must reference existing entities
  const entityIds = new Set(scene.entities.map((e) => e.id));
  for (const conn of scene.connections) {
    expect(conn.id).toBeTruthy();
    expect(entityIds.has(conn.from)).toBe(true);
    expect(entityIds.has(conn.to)).toBe(true);
    expect(conn.particleConfig).toBeDefined();
  }
}

// ─── Test fixtures ─────────────────────────────────────────────────

const mockTopology: TopologyQuizLevel = {
  id: 'topo-1',
  levelId: 'l4',
  type: 'topology',
  task: '完成VLAN10的正确连线',
  nodes: [
    { id: 'pc1', type: 'pc', label: 'PC1', x: 100, y: 100, ports: [{ id: 'pc1-p1', label: 'eth0' }] },
    { id: 'sw1', type: 'switch', label: 'SW1', x: 300, y: 100, ports: [{ id: 'sw1-p1', label: 'G0/0/1' }, { id: 'sw1-p2', label: 'G0/0/2' }] },
    { id: 'srv1', type: 'server', label: 'Server', x: 500, y: 100, ports: [{ id: 'srv1-p1', label: 'eth0' }] },
  ],
  edges: [
    { id: 'c1', fromPortId: 'pc1-p1', toPortId: 'sw1-p1', visible: true },
    { id: 'c2', fromPortId: 'sw1-p2', toPortId: 'srv1-p1', visible: true },
  ],
  correctConnections: [
    { fromPortId: 'pc1-p1', toPortId: 'sw1-p1' },
    { fromPortId: 'sw1-p2', toPortId: 'srv1-p1' },
  ],
  packetPath: ['pc1-p1', 'sw1-p1', 'sw1-p2', 'srv1-p1'],
  explanation: 'PC1通过SW1连接Server',
};

const mockMatching: MatchingQuestion = {
  id: 'match-1',
  levelId: 'l3',
  type: 'matching',
  content: '将OSI模型层级与功能配对',
  leftItems: [
    { id: 'l1', text: '应用层' },
    { id: 'l2', text: '传输层' },
  ],
  rightItems: [
    { id: 'r1', text: 'HTTP/FTP' },
    { id: 'r2', text: 'TCP/UDP' },
  ],
  correctPairs: [['l1', 'r1'], ['l2', 'r2']],
  explanation: 'OSI模型各层对应不同协议',
};

const mockOrdering: OrderingQuestion = {
  id: 'order-1',
  levelId: 'l5',
  type: 'ordering',
  content: '排列TCP三次握手的步骤',
  steps: [
    { id: 's1', text: '客户端发送SYN' },
    { id: 's2', text: '服务端返回SYN+ACK' },
    { id: 's3', text: '客户端发送ACK' },
  ],
  correctOrder: ['s1', 's2', 's3'],
  explanation: 'TCP三次握手流程',
};

const mockQuiz: QuizQuestion = {
  id: 'quiz-1',
  levelId: 'l1',
  type: 'single_choice',
  content: '在华为交换机上创建VLAN 10的正确命令是？',
  options: [
    { id: 'a', text: 'vlan 10' },
    { id: 'b', text: 'create vlan 10' },
    { id: 'c', text: 'add vlan 10' },
    { id: 'd', text: 'set vlan 10' },
  ],
  correctOptionIds: ['a'],
  explanation: '在VRP系统视图下直接输入 vlan 10',
  difficulty: 'beginner',
  knowledgePointTags: ['VLAN', 'VRP命令'],
};

const mockTerminal: TerminalQuizLevel = {
  id: 'term-1',
  levelId: 'l5',
  type: 'terminal',
  scenario: '配置SW1的VLAN10',
  terminalLines: [
    { prompt: '<SW1>', command: 'system-view' },
    { prompt: '[SW1]', command: 'vlan 10', output: 'Info: VLAN 10 created.' },
  ],
  blankCommands: [
    { prompt: '[SW1-GigabitEthernet0/0/1]', answer: 'port trunk allow-pass vlan 10', hints: ['port', 'trunk'], fuzzyMatch: true },
  ],
  successOutput: '配置成功！VLAN 10 已激活',
  explanation: 'Trunk端口需要显式允许VLAN通过',
};

const mockScenario: ScenarioQuizLevel = {
  id: 'scenario-1',
  levelId: 'l8',
  type: 'scenario',
  opening: '客户反映网络间歇性中断',
  steps: [
    {
      id: 'step1',
      narrative: '你到达现场，先进行初步诊断',
      choices: [
        { id: 'c1', text: 'display interface brief', resultOutput: '端口正常', nextStepId: 'step2', isOptimal: true },
        { id: 'c2', text: '重启交换机', resultOutput: '问题暂时解决', nextStepId: null, isOptimal: false },
      ],
    },
    {
      id: 'step2',
      narrative: '端口状态正常，检查路由',
      choices: [
        { id: 'c3', text: 'display ip routing-table', resultOutput: '路由表正常', nextStepId: null, isOptimal: true },
      ],
    },
  ],
  optimalPath: ['step1', 'step2'],
  explanation: '应先诊断再操作',
};

const mockVmPlacement: VirtualizationLevel = {
  id: 'vm-1',
  levelId: 'l6',
  type: 'vm_placement',
  task: '将VM放置到合适的集群节点',
  clusterNodes: [
    { id: 'n1', label: 'Node-1', cpuTotal: 32, cpuUsed: 10, memoryTotalGB: 256, memoryUsedGB: 64, storageTotalTB: 10, storageUsedTB: 3, status: 'healthy', x: 150, y: 100 },
    { id: 'n2', label: 'Node-2', cpuTotal: 32, cpuUsed: 28, memoryTotalGB: 256, memoryUsedGB: 240, storageTotalTB: 10, storageUsedTB: 8, status: 'warning', x: 400, y: 100 },
  ],
  vms: [
    { id: 'vm1', name: 'Web-VM', cpuCores: 4, memoryGB: 8, storageSizeGB: 100, nodeId: 'n1', status: 'running' },
    { id: 'vm2', name: 'DB-VM', cpuCores: 8, memoryGB: 32, storageSizeGB: 500, nodeId: '', status: 'stopped' },
  ],
  explanation: '根据节点容量放置VM',
};

const mockMapData: LevelMapData = {
  courseId: 'test-course',
  nodes: [
    { levelId: 'l1', title: '网络基础', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
    { levelId: 'l2', title: 'OSI模型', type: 'quiz', status: 'unlocked', stars: 0, x: 400, y: 100 },
    { levelId: 'l3', title: 'VLAN配置', type: 'topology', status: 'locked', stars: 0, x: 300, y: 250 },
  ],
  edges: [
    { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
    { fromLevelId: 'l1', toLevelId: 'l3', particleState: 'static' },
    { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'pulsing' },
  ],
};

// ─── Tests ─────────────────────────────────────────────────────────

describe('VisualScene Protocol - Adapter Tests', () => {
  describe('topologyAdapter', () => {
    it('should produce a valid scene from TopologyQuizLevel', () => {
      const scene = topologyAdapter(mockTopology);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('topology');
      expect(scene.entities).toHaveLength(3); // 3 devices
      expect(scene.connections).toHaveLength(2); // 2 visible cables
      expect(scene.interactions).toHaveLength(1);
      expect(scene.interactions[0].type).toBe('connect');
    });

    it('should validate correct individual connection pair', () => {
      const scene = topologyAdapter(mockTopology);
      const result = scene.interactions[0].validate({
        fromId: 'pc1-p1',
        toId: 'sw1-p1',
      });
      expect(result.correct).toBe(true);
      expect(result.highlightIds).toContain('pc1-p1');
    });

    it('should reject incorrect connection pair', () => {
      const scene = topologyAdapter(mockTopology);
      const result = scene.interactions[0].validate({
        fromId: 'pc1-p1',
        toId: 'srv1-p1',
      });
      expect(result.correct).toBe(false);
    });

    it('should activate packet flow particles', () => {
      const scene = topologyAdapter(mockTopology);
      const activated = activatePacketFlow(scene, mockTopology);
      const flowingConns = activated.connections.filter((c) => c.particleConfig.enabled);
      expect(flowingConns.length).toBeGreaterThan(0);
    });
  });

  describe('matchingAdapter', () => {
    it('should produce a valid scene from MatchingQuestion', () => {
      const scene = matchingAdapter(mockMatching);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('matching');
      expect(scene.entities).toHaveLength(4); // 2 left + 2 right
      expect(scene.connections).toHaveLength(0); // no pre-drawn connections
    });

    it('should validate correct pair', () => {
      const scene = matchingAdapter(mockMatching);
      const result = scene.interactions[0].validate({ fromId: 'l1', toId: 'r1' });
      expect(result.correct).toBe(true);
    });

    it('should reject incorrect pair', () => {
      const scene = matchingAdapter(mockMatching);
      const result = scene.interactions[0].validate({ fromId: 'l1', toId: 'r2' });
      expect(result.correct).toBe(false);
    });
  });

  describe('orderingAdapter', () => {
    it('should produce a valid scene from OrderingQuestion', () => {
      const scene = orderingAdapter(mockOrdering);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('ordering');
      // 3 steps + 3 slots
      expect(scene.entities).toHaveLength(6);
      // 2 chain connections between slots
      expect(scene.connections).toHaveLength(2);
    });

    it('should validate correct sequence', () => {
      const scene = orderingAdapter(mockOrdering);
      const seqRule = scene.interactions.find((i) => i.type === 'sequence');
      expect(seqRule).toBeDefined();
      const result = seqRule!.validate({ orderedIds: ['s1', 's2', 's3'] });
      expect(result.correct).toBe(true);
    });

    it('should reject wrong sequence', () => {
      const scene = orderingAdapter(mockOrdering);
      const seqRule = scene.interactions.find((i) => i.type === 'sequence');
      const result = seqRule!.validate({ orderedIds: ['s2', 's1', 's3'] });
      expect(result.correct).toBe(false);
    });

    it('should activate flow after correct ordering', () => {
      const scene = orderingAdapter(mockOrdering);
      const activated = activateOrderFlow(scene);
      expect(activated.connections.every((c) => c.particleConfig.enabled)).toBe(true);
    });
  });

  describe('quizAdapter', () => {
    it('should produce a valid scene from QuizQuestion', () => {
      const scene = quizAdapter(mockQuiz);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('quiz');
      // 1 center + 4 options
      expect(scene.entities).toHaveLength(5);
      // 4 connections (center to each option)
      expect(scene.connections).toHaveLength(4);
    });

    it('should validate correct option click', () => {
      const scene = quizAdapter(mockQuiz);
      const result = scene.interactions[0].validate({ entityId: 'a' });
      expect(result.correct).toBe(true);
    });

    it('should reject incorrect option', () => {
      const scene = quizAdapter(mockQuiz);
      const result = scene.interactions[0].validate({ entityId: 'b' });
      expect(result.correct).toBe(false);
    });

    it('should highlight correct option after answer', () => {
      const scene = quizAdapter(mockQuiz);
      const highlighted = highlightCorrectOption(scene, ['a']);
      const correctEntity = highlighted.entities.find((e) => e.id === 'a');
      expect(correctEntity?.style.stroke).toBe('#22c55e');
    });
  });

  describe('terminalAdapter', () => {
    it('should produce a valid scene from TerminalQuizLevel', () => {
      const scene = terminalAdapter(mockTerminal);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('terminal');
      // 2 lines + 1 output + 1 blank = 4 entities
      expect(scene.entities.length).toBeGreaterThanOrEqual(3);
    });

    it('should validate correct command input', () => {
      const scene = terminalAdapter(mockTerminal);
      const inputRule = scene.interactions.find((i) => i.type === 'input');
      expect(inputRule).toBeDefined();
      const result = inputRule!.validate({
        entityId: 'blank-0',
        value: 'port trunk allow-pass vlan 10',
      });
      expect(result.correct).toBe(true);
    });

    it('should accept fuzzy-matched input', () => {
      const scene = terminalAdapter(mockTerminal);
      const inputRule = scene.interactions.find((i) => i.type === 'input');
      const result = inputRule!.validate({
        entityId: 'blank-0',
        value: 'PORT  TRUNK  ALLOW-PASS  VLAN  10',
      });
      expect(result.correct).toBe(true);
    });

    it('should activate flow after completion', () => {
      const scene = terminalAdapter(mockTerminal);
      const activated = activateTerminalFlow(scene);
      expect(activated.connections.every((c) => c.particleConfig.enabled)).toBe(true);
    });
  });

  describe('scenarioAdapter', () => {
    it('should produce a valid scene from ScenarioQuizLevel', () => {
      const scene = scenarioAdapter(mockScenario);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('scenario');
      // opening + 2 steps + 3 choices = 6
      expect(scene.entities.length).toBeGreaterThanOrEqual(5);
    });

    it('should validate optimal choice', () => {
      const scene = scenarioAdapter(mockScenario);
      const result = scene.interactions[0].validate({ entityId: 'c1' });
      expect(result.correct).toBe(true);
    });

    it('should reject non-optimal choice', () => {
      const scene = scenarioAdapter(mockScenario);
      const result = scene.interactions[0].validate({ entityId: 'c2' });
      expect(result.correct).toBe(false);
    });

    it('should highlight optimal path', () => {
      const scene = scenarioAdapter(mockScenario);
      const highlighted = highlightOptimalPath(scene, ['step1', 'step2']);
      const flowingConns = highlighted.connections.filter((c) => c.particleConfig.enabled);
      expect(flowingConns.length).toBeGreaterThan(0);
    });
  });

  describe('vmPlacementAdapter', () => {
    it('should produce a valid scene from VirtualizationLevel', () => {
      const scene = vmPlacementAdapter(mockVmPlacement);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('vm_placement');
      // 2 nodes + 2 VMs = 4 entities
      expect(scene.entities).toHaveLength(4);
    });

    it('should validate VM placement with capacity', () => {
      const scene = vmPlacementAdapter(mockVmPlacement);
      const dragRule = scene.interactions.find((i) => i.type === 'drag');
      expect(dragRule).toBeDefined();

      // VM2 (8 core, 32GB) → Node-1 (22 cores free, 192GB free) = OK
      const result = dragRule!.validate({ entityId: 'vm2', targetSlot: 'n1' });
      expect(result.correct).toBe(true);
    });

    it('should reject VM placement when insufficient capacity', () => {
      const scene = vmPlacementAdapter(mockVmPlacement);
      const dragRule = scene.interactions.find((i) => i.type === 'drag');

      // VM2 (8 core, 32GB) → Node-2 (4 cores free, 16GB free) = Fail
      const result = dragRule!.validate({ entityId: 'vm2', targetSlot: 'n2' });
      expect(result.correct).toBe(false);
    });
  });

  describe('mapAdapter', () => {
    it('should produce a valid scene from LevelMapData', () => {
      const scene = mapAdapter(mockMapData);
      assertValidScene(scene);
      expect(scene.sourceType).toBe('map');
      expect(scene.entities).toHaveLength(3);
      expect(scene.connections).toHaveLength(3);
    });

    it('should set flowing particles on completed edges', () => {
      const scene = mapAdapter(mockMapData);
      const flowingConn = scene.connections.find((c) => c.from === 'l1' && c.to === 'l2');
      expect(flowingConn?.particleConfig.enabled).toBe(true);
      expect(flowingConn?.particleConfig.color).toBe('#FFD700');
    });

    it('should set pulsing particles on unlocked edges', () => {
      const scene = mapAdapter(mockMapData);
      const pulsingConn = scene.connections.find((c) => c.from === 'l2' && c.to === 'l3');
      expect(pulsingConn?.particleConfig.enabled).toBe(true);
      expect(pulsingConn?.particleConfig.color).toBe('#3996f6');
    });

    it('should disable particles on locked edges', () => {
      const scene = mapAdapter(mockMapData);
      const staticConn = scene.connections.find((c) => c.from === 'l1' && c.to === 'l3');
      expect(staticConn?.particleConfig.enabled).toBe(false);
    });

    it('should set locked entities to lower opacity', () => {
      const scene = mapAdapter(mockMapData);
      const lockedEntity = scene.entities.find((e) => e.id === 'l3');
      expect(lockedEntity?.style.opacity).toBe(0.5);
    });
  });
});
