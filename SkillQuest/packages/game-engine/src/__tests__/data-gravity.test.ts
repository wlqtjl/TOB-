/**
 * Data Gravity — "数据引力" 物理交互系统 完整测试
 *
 * 覆盖:
 * 1. Vec2 向量运算
 * 2. CorePhysicsEngine: 引力, 摩擦, 碰撞, tick 循环
 * 3. NodeManager: 节点质量, 状态, CRUD
 * 4. GravityGunController: 4 种引力枪工具
 * 5. EnergyMonitor: 能量计算, 熵增追踪
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type {
  Vec2,
  GravityNode,
  DataParticle,
  CollisionSegment,
  DataGravityState,
} from '@skillquest/types';

// ─── Vec2 ──────────────────────────────────────────────────────────
import {
  vec2, add, sub, scale, length, lengthSq, normalize,
  distance, distanceSq, dot, cross, reflect, clampLength, ZERO,
} from '../data-gravity/vec2';

// ─── CorePhysicsEngine ─────────────────────────────────────────────
import {
  dopplerColor,
  computeNodeGravity,
  computeAnchorGravity,
  computeAntiAffinityForce,
  checkSegmentCollision,
  tickParticle,
  updatePhysics,
  createDataGravityState,
} from '../data-gravity/core-physics-engine';

// ─── NodeManager ──────────────────────────────────────────────────
import {
  computeNodeMass,
  createGravityNode,
  updateNodeStatus,
  updateNodeCapacity,
  updateNodeBandwidth,
  updateNode,
  updateNodeInGravityState,
  addNodeToGravityState,
  removeNodeFromGravityState,
  injectNodeFailure,
  recoverNode,
} from '../data-gravity/node-manager';

// ─── GravityGunController ──────────────────────────────────────────
import {
  resetIdCounter,
  createGravityAnchor,
  placeGravityAnchor,
  createForceShield,
  placeForceShield,
  activateLens,
  updateLensPosition,
  deactivateLens,
  getParticlesInLens,
  applySingularity,
  executeGravityGunAction,
} from '../data-gravity/gravity-gun-controller';

// ─── EnergyMonitor ─────────────────────────────────────────────────
import {
  computeKineticEnergy,
  computePotentialEnergy,
  computeTotalDisplacement,
  computeEntropyDelta,
  computeEnergyMetrics,
  createEntropyHistory,
  recordEntropy,
  averageEntropy,
  peakEntropy,
} from '../data-gravity/energy-monitor';

// ─── Test Helpers ──────────────────────────────────────────────────

function makeParticle(overrides: Partial<DataParticle> = {}): DataParticle {
  return {
    id: 'p1',
    position: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    mass: 1,
    replicaId: 'replica-A',
    color: '#58A6FF',
    trail: [],
    metadata: { type: 'data-block', size: 1024 },
    ...overrides,
  };
}

function makeNode(overrides: Partial<GravityNode> = {}): GravityNode {
  return {
    id: 'node-1',
    position: { x: 300, y: 300 },
    mass: 100,
    status: 'normal',
    capacity: 1.0,
    bandwidth: 1.0,
    label: 'Node 1',
    ...overrides,
  };
}

function makeState(overrides: Partial<DataGravityState> = {}): DataGravityState {
  return {
    nodes: [],
    particles: [],
    anchors: [],
    segments: [],
    lens: { active: false, position: { x: 0, y: 0 }, radius: 100 },
    G: 2000,
    friction: 0.5,
    maxTrailLength: 10,
    totalEnergyLoss: 0,
    lastTickDisplacement: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Vec2 Tests
// ═══════════════════════════════════════════════════════════════════

describe('Vec2 — 向量运算', () => {
  it('vec2 创建向量', () => {
    const v = vec2(3, 4);
    expect(v).toEqual({ x: 3, y: 4 });
  });

  it('add 向量加法', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });

  it('sub 向量减法', () => {
    expect(sub({ x: 5, y: 6 }, { x: 3, y: 2 })).toEqual({ x: 2, y: 4 });
  });

  it('scale 标量乘法', () => {
    expect(scale({ x: 2, y: 3 }, 3)).toEqual({ x: 6, y: 9 });
  });

  it('length 向量长度', () => {
    expect(length({ x: 3, y: 4 })).toBeCloseTo(5, 10);
  });

  it('lengthSq 向量长度平方', () => {
    expect(lengthSq({ x: 3, y: 4 })).toBe(25);
  });

  it('normalize 归一化', () => {
    const n = normalize({ x: 3, y: 4 });
    expect(length(n)).toBeCloseTo(1, 10);
    expect(n.x).toBeCloseTo(0.6, 10);
    expect(n.y).toBeCloseTo(0.8, 10);
  });

  it('normalize 零向量返回零向量', () => {
    expect(normalize(ZERO)).toEqual({ x: 0, y: 0 });
  });

  it('distance 两点距离', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 10);
  });

  it('distanceSq 两点距离平方', () => {
    expect(distanceSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });

  it('dot 点积', () => {
    expect(dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it('cross 叉积', () => {
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it('reflect 反射', () => {
    const v = { x: 1, y: -1 };
    const n = { x: 0, y: 1 };
    const r = reflect(v, n);
    expect(r.x).toBeCloseTo(1, 10);
    expect(r.y).toBeCloseTo(1, 10);
  });

  it('clampLength 限制最大长度', () => {
    const v = { x: 30, y: 40 }; // length = 50
    const clamped = clampLength(v, 10);
    expect(length(clamped)).toBeCloseTo(10, 5);
  });

  it('clampLength 未超过则不变', () => {
    const v = { x: 3, y: 4 }; // length = 5
    const clamped = clampLength(v, 10);
    expect(clamped).toEqual(v);
  });

  it('ZERO 常量', () => {
    expect(ZERO).toEqual({ x: 0, y: 0 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CorePhysicsEngine Tests
// ═══════════════════════════════════════════════════════════════════

describe('CorePhysicsEngine — 引力/碰撞/tick', () => {
  describe('dopplerColor 多普勒色移', () => {
    it('零速度 → 暗橙色', () => {
      const color = dopplerColor(0);
      expect(color).toBe('rgb(255,140,0)');
    });

    it('最大速度 → 电光蓝', () => {
      const color = dopplerColor(800);
      expect(color).toBe('rgb(0,242,255)');
    });

    it('中等速度 → 中间色', () => {
      const color = dopplerColor(400, 800);
      expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    });

    it('超出范围钳位', () => {
      expect(dopplerColor(-100)).toBe(dopplerColor(0));
      expect(dopplerColor(10000)).toBe(dopplerColor(800));
    });
  });

  describe('computeNodeGravity 节点引力', () => {
    it('正常节点吸引粒子 (力指向节点)', () => {
      const node = makeNode({ position: { x: 300, y: 300 }, mass: 100 });
      const particle = makeParticle({ position: { x: 100, y: 100 } });
      const force = computeNodeGravity(node, particle, 2000);
      // 力方向: 从粒子指向节点 (正 x, 正 y)
      expect(force.x).toBeGreaterThan(0);
      expect(force.y).toBeGreaterThan(0);
    });

    it('故障节点排斥粒子 (力远离节点)', () => {
      const node = makeNode({ position: { x: 300, y: 300 }, mass: 100, status: 'failed' });
      const particle = makeParticle({ position: { x: 100, y: 100 } });
      const force = computeNodeGravity(node, particle, 2000);
      // 力方向: 远离节点 (负 x, 负 y)
      expect(force.x).toBeLessThan(0);
      expect(force.y).toBeLessThan(0);
    });

    it('距离越近引力越大', () => {
      const node = makeNode({ position: { x: 200, y: 100 } });
      const nearParticle = makeParticle({ position: { x: 170, y: 100 } }); // 30px
      const farParticle = makeParticle({ position: { x: 100, y: 100 } }); // 100px
      const nearForce = computeNodeGravity(node, nearParticle, 2000);
      const farForce = computeNodeGravity(node, farParticle, 2000);
      expect(length(nearForce)).toBeGreaterThan(length(farForce));
    });
  });

  describe('computeAnchorGravity 锚点引力', () => {
    it('锚点吸引粒子', () => {
      const anchor = { id: 'a1', position: { x: 500, y: 500 }, mass: 5000, lifetimeMs: 3000 };
      const particle = makeParticle({ position: { x: 100, y: 100 } });
      const force = computeAnchorGravity(anchor, particle, 2000);
      expect(force.x).toBeGreaterThan(0);
      expect(force.y).toBeGreaterThan(0);
    });
  });

  describe('computeAntiAffinityForce 副本互斥', () => {
    it('同组副本互斥', () => {
      const p1 = makeParticle({ id: 'p1', position: { x: 100, y: 100 }, replicaId: 'A' });
      const p2 = makeParticle({ id: 'p2', position: { x: 120, y: 100 }, replicaId: 'A' });
      const force = computeAntiAffinityForce(p1, [p1, p2]);
      // p1 should be pushed away from p2 (negative x)
      expect(force.x).toBeLessThan(0);
    });

    it('不同组副本无互斥力', () => {
      const p1 = makeParticle({ id: 'p1', position: { x: 100, y: 100 }, replicaId: 'A' });
      const p2 = makeParticle({ id: 'p2', position: { x: 120, y: 100 }, replicaId: 'B' });
      const force = computeAntiAffinityForce(p1, [p1, p2]);
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
    });

    it('超出作用距离无力', () => {
      const p1 = makeParticle({ id: 'p1', position: { x: 0, y: 0 }, replicaId: 'A' });
      const p2 = makeParticle({ id: 'p2', position: { x: 1000, y: 0 }, replicaId: 'A' });
      const force = computeAntiAffinityForce(p1, [p1, p2]);
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
    });
  });

  describe('checkSegmentCollision 碰撞段检测', () => {
    it('粒子靠近碰撞段时反弹', () => {
      const segment: CollisionSegment = {
        id: 's1',
        start: { x: 0, y: 50 },
        end: { x: 200, y: 50 },
        lifetimeMs: 5000,
        restitution: 0.8,
      };
      // 粒子位于碰撞段附近 (距离 < 5px)
      const particle = makeParticle({
        position: { x: 100, y: 53 },
        velocity: { x: 0, y: -50 },
      });
      const result = checkSegmentCollision(particle, segment);
      // 应该反弹 (y 速度翻转)
      expect(result).not.toBeNull();
      if (result) {
        expect(result.y).toBeGreaterThan(0); // 反弹方向
      }
    });

    it('粒子远离碰撞段时无碰撞', () => {
      const segment: CollisionSegment = {
        id: 's1',
        start: { x: 0, y: 50 },
        end: { x: 200, y: 50 },
        lifetimeMs: 5000,
        restitution: 0.8,
      };
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: -50 },
      });
      const result = checkSegmentCollision(particle, segment);
      expect(result).toBeNull();
    });
  });

  describe('createDataGravityState 状态初始化', () => {
    it('创建默认状态', () => {
      const state = createDataGravityState([], []);
      expect(state.G).toBe(2000);
      expect(state.friction).toBe(0.5);
      expect(state.maxTrailLength).toBe(10);
      expect(state.totalEnergyLoss).toBe(0);
      expect(state.anchors).toEqual([]);
      expect(state.segments).toEqual([]);
      expect(state.lens.active).toBe(false);
    });

    it('创建自定义参数状态', () => {
      const state = createDataGravityState([], [], { G: 5000, friction: 0.8 });
      expect(state.G).toBe(5000);
      expect(state.friction).toBe(0.8);
    });
  });

  describe('updatePhysics 全局 Tick', () => {
    it('粒子在引力场中加速', () => {
      const node = makeNode({ position: { x: 300, y: 100 }, mass: 100 });
      const particle = makeParticle({ position: { x: 100, y: 100 }, velocity: { x: 0, y: 0 } });
      const state = createDataGravityState([node], [particle]);

      const updated = updatePhysics(state, 16); // 16ms = ~60fps

      // 粒子应向节点方向移动
      expect(updated.particles[0].position.x).toBeGreaterThan(100);
    });

    it('摩擦力减速粒子', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
      });
      const state = createDataGravityState([], [particle], { friction: 5 });

      const updated = updatePhysics(state, 16);
      const speed = length(updated.particles[0].velocity);
      expect(speed).toBeLessThan(100);
    });

    it('锚点生命周期衰减', () => {
      const state = makeState({
        anchors: [{ id: 'a1', position: { x: 0, y: 0 }, mass: 5000, lifetimeMs: 100 }],
      });
      const updated = updatePhysics(state, 50);
      expect(updated.anchors.length).toBe(1);
      expect(updated.anchors[0].lifetimeMs).toBe(50);

      const updated2 = updatePhysics(updated, 60);
      expect(updated2.anchors.length).toBe(0); // 过期移除
    });

    it('碰撞段生命周期衰减', () => {
      const state = makeState({
        segments: [{
          id: 's1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 },
          lifetimeMs: 80, restitution: 0.8,
        }],
      });
      const updated = updatePhysics(state, 100);
      expect(updated.segments.length).toBe(0);
    });

    it('计算总位移', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
      });
      const state = createDataGravityState([], [particle]);
      const updated = updatePhysics(state, 100); // 100ms
      expect(updated.lastTickDisplacement).toBeGreaterThan(0);
    });

    it('粒子拖尾更新', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
        trail: [],
      });
      const state = createDataGravityState([], [particle]);
      const updated = updatePhysics(state, 16);
      expect(updated.particles[0].trail.length).toBe(1);
      expect(updated.particles[0].trail[0]).toEqual({ x: 100, y: 100 });
    });

    it('多普勒色移更新', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 500, y: 0 },
      });
      const state = createDataGravityState([], [particle]);
      const updated = updatePhysics(state, 16);
      expect(updated.particles[0].color).toMatch(/^rgb\(/);
    });

    it('能量损耗累加', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 200, y: 0 },
      });
      const state = createDataGravityState([], [particle], { friction: 1.0 });
      const updated = updatePhysics(state, 100);
      expect(updated.totalEnergyLoss).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// NodeManager Tests
// ═══════════════════════════════════════════════════════════════════

describe('NodeManager — 节点管理', () => {
  describe('computeNodeMass', () => {
    it('满容量满带宽 → 最大质量', () => {
      expect(computeNodeMass(1.0, 1.0)).toBe(100);
    });

    it('零容量 → 零质量', () => {
      expect(computeNodeMass(0, 1.0)).toBe(0);
    });

    it('零带宽 → 零质量', () => {
      expect(computeNodeMass(1.0, 0)).toBe(0);
    });

    it('半容量半带宽 → 25%质量', () => {
      expect(computeNodeMass(0.5, 0.5)).toBe(25);
    });

    it('负值钳位为零', () => {
      expect(computeNodeMass(-0.5, 1.0)).toBe(0);
    });
  });

  describe('createGravityNode', () => {
    it('创建默认节点', () => {
      const node = createGravityNode('n1', { x: 100, y: 200 });
      expect(node.id).toBe('n1');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.status).toBe('normal');
      expect(node.capacity).toBe(1.0);
      expect(node.bandwidth).toBe(1.0);
      expect(node.mass).toBe(100);
    });

    it('创建自定义节点', () => {
      const node = createGravityNode('n2', { x: 0, y: 0 }, {
        capacity: 0.5,
        bandwidth: 0.8,
        status: 'overloaded',
        label: '存储节点 A',
      });
      expect(node.status).toBe('overloaded');
      expect(node.mass).toBe(computeNodeMass(0.5, 0.8));
      expect(node.label).toBe('存储节点 A');
    });
  });

  describe('updateNodeStatus', () => {
    it('更新状态', () => {
      const node = createGravityNode('n1', { x: 0, y: 0 });
      const failed = updateNodeStatus(node, 'failed');
      expect(failed.status).toBe('failed');
      expect(failed.mass).toBe(node.mass); // mass 不变, 翻转由物理引擎处理
    });
  });

  describe('updateNodeCapacity', () => {
    it('更新容量并重算质量', () => {
      const node = createGravityNode('n1', { x: 0, y: 0 });
      const updated = updateNodeCapacity(node, 0.5);
      expect(updated.capacity).toBe(0.5);
      expect(updated.mass).toBe(computeNodeMass(0.5, 1.0));
    });

    it('容量钳位到 [0, 1]', () => {
      const node = createGravityNode('n1', { x: 0, y: 0 });
      expect(updateNodeCapacity(node, 2.0).capacity).toBe(1);
      expect(updateNodeCapacity(node, -1.0).capacity).toBe(0);
    });
  });

  describe('updateNodeBandwidth', () => {
    it('更新带宽并重算质量', () => {
      const node = createGravityNode('n1', { x: 0, y: 0 });
      const updated = updateNodeBandwidth(node, 0.3);
      expect(updated.bandwidth).toBe(0.3);
      expect(updated.mass).toBe(computeNodeMass(1.0, 0.3));
    });
  });

  describe('updateNode 批量更新', () => {
    it('同时更新多个属性', () => {
      const node = createGravityNode('n1', { x: 0, y: 0 });
      const updated = updateNode(node, {
        status: 'overloaded',
        capacity: 0.2,
        bandwidth: 0.3,
      });
      expect(updated.status).toBe('overloaded');
      expect(updated.capacity).toBe(0.2);
      expect(updated.bandwidth).toBe(0.3);
      expect(updated.mass).toBe(computeNodeMass(0.2, 0.3));
    });
  });

  describe('State-level 操作', () => {
    let state: DataGravityState;

    beforeEach(() => {
      state = createDataGravityState([
        createGravityNode('n1', { x: 100, y: 100 }),
        createGravityNode('n2', { x: 300, y: 300 }),
      ], []);
    });

    it('updateNodeInGravityState 更新节点', () => {
      const updated = updateNodeInGravityState(state, 'n1', { status: 'failed' });
      expect(updated.nodes[0].status).toBe('failed');
      expect(updated.nodes[1].status).toBe('normal');
    });

    it('addNodeToGravityState 添加节点', () => {
      const newNode = createGravityNode('n3', { x: 500, y: 500 });
      const updated = addNodeToGravityState(state, newNode);
      expect(updated.nodes.length).toBe(3);
    });

    it('removeNodeFromGravityState 移除节点', () => {
      const updated = removeNodeFromGravityState(state, 'n1');
      expect(updated.nodes.length).toBe(1);
      expect(updated.nodes[0].id).toBe('n2');
    });

    it('injectNodeFailure 故障注入', () => {
      const updated = injectNodeFailure(state, 'n2');
      expect(updated.nodes[1].status).toBe('failed');
    });

    it('recoverNode 节点恢复', () => {
      const failed = injectNodeFailure(state, 'n1');
      const recovered = recoverNode(failed, 'n1');
      expect(recovered.nodes[0].status).toBe('normal');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// GravityGunController Tests
// ═══════════════════════════════════════════════════════════════════

describe('GravityGunController — 引力枪工具箱', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('GravityAnchor 引力锚点', () => {
    it('创建锚点', () => {
      const anchor = createGravityAnchor({ x: 200, y: 300 });
      expect(anchor.position).toEqual({ x: 200, y: 300 });
      expect(anchor.mass).toBe(5000);
      expect(anchor.lifetimeMs).toBe(3000);
    });

    it('自定义锚点参数', () => {
      const anchor = createGravityAnchor({ x: 0, y: 0 }, { mass: 10000, lifetimeMs: 5000 });
      expect(anchor.mass).toBe(10000);
      expect(anchor.lifetimeMs).toBe(5000);
    });

    it('placeGravityAnchor 在状态中放置锚点', () => {
      const state = makeState();
      const updated = placeGravityAnchor(state, { x: 100, y: 100 });
      expect(updated.anchors.length).toBe(1);
      expect(updated.anchors[0].position).toEqual({ x: 100, y: 100 });
    });
  });

  describe('ForceShield 能量护盾', () => {
    it('创建碰撞段', () => {
      const shield = createForceShield({ x: 0, y: 0 }, { x: 100, y: 0 });
      expect(shield.start).toEqual({ x: 0, y: 0 });
      expect(shield.end).toEqual({ x: 100, y: 0 });
      expect(shield.restitution).toBe(0.8);
    });

    it('placeForceShield 在状态中放置护盾', () => {
      const state = makeState();
      const updated = placeForceShield(state, { x: 0, y: 50 }, { x: 200, y: 50 });
      expect(updated.segments.length).toBe(1);
    });
  });

  describe('TheLens 引力透镜', () => {
    it('激活透镜', () => {
      const state = makeState();
      const updated = activateLens(state, { x: 400, y: 400 });
      expect(updated.lens.active).toBe(true);
      expect(updated.lens.position).toEqual({ x: 400, y: 400 });
      expect(updated.lens.radius).toBe(120); // 默认
    });

    it('自定义透镜半径', () => {
      const state = makeState();
      const updated = activateLens(state, { x: 0, y: 0 }, 200);
      expect(updated.lens.radius).toBe(200);
    });

    it('updateLensPosition 更新位置', () => {
      let state = activateLens(makeState(), { x: 0, y: 0 });
      state = updateLensPosition(state, { x: 100, y: 200 });
      expect(state.lens.position).toEqual({ x: 100, y: 200 });
    });

    it('未激活时 updateLensPosition 不变', () => {
      const state = makeState();
      const updated = updateLensPosition(state, { x: 100, y: 200 });
      expect(updated.lens.position).toEqual({ x: 0, y: 0 });
    });

    it('deactivateLens 关闭透镜', () => {
      let state = activateLens(makeState(), { x: 0, y: 0 });
      state = deactivateLens(state);
      expect(state.lens.active).toBe(false);
    });

    it('getParticlesInLens 获取范围内粒子', () => {
      const p1 = makeParticle({ id: 'p1', position: { x: 100, y: 100 } });
      const p2 = makeParticle({ id: 'p2', position: { x: 500, y: 500 } });
      let state = makeState({ particles: [p1, p2] });
      state = activateLens(state, { x: 110, y: 110 }, 50); // 50px 半径

      const inLens = getParticlesInLens(state);
      expect(inLens.length).toBe(1);
      expect(inLens[0].id).toBe('p1');
    });

    it('未激活时 getParticlesInLens 返回空', () => {
      const state = makeState({ particles: [makeParticle()] });
      expect(getParticlesInLens(state)).toEqual([]);
    });
  });

  describe('Singularity 奇点引爆', () => {
    it('近距离粒子受到更大冲量', () => {
      const nearP = makeParticle({ id: 'near', position: { x: 110, y: 100 }, velocity: { x: 0, y: 0 } });
      const farP = makeParticle({ id: 'far', position: { x: 250, y: 100 }, velocity: { x: 0, y: 0 } });
      const state = makeState({ particles: [nearP, farP] });

      const updated = applySingularity(state, { x: 100, y: 100 });
      const nearSpeed = length(updated.particles[0].velocity);
      const farSpeed = length(updated.particles[1].velocity);
      expect(nearSpeed).toBeGreaterThan(farSpeed);
    });

    it('超出作用范围的粒子不受影响', () => {
      const farP = makeParticle({ id: 'far', position: { x: 1000, y: 1000 }, velocity: { x: 0, y: 0 } });
      const state = makeState({ particles: [farP] });

      const updated = applySingularity(state, { x: 0, y: 0 });
      expect(updated.particles[0].velocity).toEqual({ x: 0, y: 0 });
    });

    it('脉冲方向为径向 (远离中心)', () => {
      const p = makeParticle({ id: 'p1', position: { x: 200, y: 100 }, velocity: { x: 0, y: 0 } });
      const state = makeState({ particles: [p] });

      const updated = applySingularity(state, { x: 100, y: 100 });
      expect(updated.particles[0].velocity.x).toBeGreaterThan(0);
      expect(Math.abs(updated.particles[0].velocity.y)).toBeLessThan(0.01);
    });
  });

  describe('executeGravityGunAction 统一入口', () => {
    it('执行 gravity_anchor', () => {
      const state = makeState();
      const updated = executeGravityGunAction(state, {
        tool: 'gravity_anchor',
        position: { x: 100, y: 100 },
      });
      expect(updated.anchors.length).toBe(1);
    });

    it('执行 force_shield', () => {
      const state = makeState();
      const updated = executeGravityGunAction(state, {
        tool: 'force_shield',
        position: { x: 0, y: 0 },
        endPosition: { x: 200, y: 0 },
      });
      expect(updated.segments.length).toBe(1);
    });

    it('执行 the_lens', () => {
      const state = makeState();
      const updated = executeGravityGunAction(state, {
        tool: 'the_lens',
        position: { x: 400, y: 400 },
      });
      expect(updated.lens.active).toBe(true);
    });

    it('执行 singularity', () => {
      const p = makeParticle({ position: { x: 110, y: 100 }, velocity: { x: 0, y: 0 } });
      const state = makeState({ particles: [p] });
      const updated = executeGravityGunAction(state, {
        tool: 'singularity',
        position: { x: 100, y: 100 },
      });
      expect(length(updated.particles[0].velocity)).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// EnergyMonitor Tests
// ═══════════════════════════════════════════════════════════════════

describe('EnergyMonitor — 能量监测', () => {
  describe('computeKineticEnergy 动能', () => {
    it('静止粒子动能为零', () => {
      const p = makeParticle({ velocity: { x: 0, y: 0 } });
      expect(computeKineticEnergy([p])).toBe(0);
    });

    it('运动粒子动能 = ½mv²', () => {
      const p = makeParticle({ velocity: { x: 3, y: 4 }, mass: 2 });
      // v² = 9 + 16 = 25, KE = 0.5 * 2 * 25 = 25
      expect(computeKineticEnergy([p])).toBe(25);
    });

    it('多粒子动能累加', () => {
      const p1 = makeParticle({ id: 'p1', velocity: { x: 10, y: 0 }, mass: 1 });
      const p2 = makeParticle({ id: 'p2', velocity: { x: 0, y: 10 }, mass: 1 });
      // KE1 = 0.5 * 100 = 50, KE2 = 50
      expect(computeKineticEnergy([p1, p2])).toBe(100);
    });
  });

  describe('computePotentialEnergy 势能', () => {
    it('正常节点产生负势能 (引力束缚)', () => {
      const p = makeParticle({ position: { x: 100, y: 100 } });
      const n = makeNode({ position: { x: 200, y: 100 }, mass: 100, status: 'normal' });
      const pe = computePotentialEnergy([p], [n], 2000);
      expect(pe).toBeLessThan(0);
    });

    it('故障节点产生正势能 (斥力)', () => {
      const p = makeParticle({ position: { x: 100, y: 100 } });
      const n = makeNode({ position: { x: 200, y: 100 }, mass: 100, status: 'failed' });
      const pe = computePotentialEnergy([p], [n], 2000);
      expect(pe).toBeGreaterThan(0);
    });
  });

  describe('computeTotalDisplacement', () => {
    it('位移为零', () => {
      const before = [makeParticle({ position: { x: 100, y: 100 } })];
      const after = [makeParticle({ position: { x: 100, y: 100 } })];
      expect(computeTotalDisplacement(before, after)).toBe(0);
    });

    it('正确计算位移', () => {
      const before = [makeParticle({ position: { x: 0, y: 0 } })];
      const after = [makeParticle({ position: { x: 3, y: 4 } })];
      expect(computeTotalDisplacement(before, after)).toBeCloseTo(5, 10);
    });
  });

  describe('computeEntropyDelta 熵增', () => {
    it('无变化无锚点 → 零熵增', () => {
      expect(computeEntropyDelta(1000, 1000, 0)).toBe(0);
    });

    it('动能变化 → 正熵增', () => {
      expect(computeEntropyDelta(2000, 1000, 0)).toBe(1000);
    });

    it('锚点增加扰动', () => {
      expect(computeEntropyDelta(1000, 1000, 3)).toBe(1500); // 3 × 500
    });
  });

  describe('computeEnergyMetrics 综合指标', () => {
    it('计算所有指标', () => {
      const particle = makeParticle({
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
        mass: 1,
      });
      const node = makeNode({ position: { x: 300, y: 100 } });
      const state = createDataGravityState([node], [particle]);
      const stateWithDisp = { ...state, lastTickDisplacement: 50 };

      const metrics = computeEnergyMetrics(stateWithDisp, 0, 0.016);
      expect(metrics.kineticEnergy).toBe(5000); // 0.5 * 1 * 10000
      expect(metrics.displacement).toBe(50);
      expect(metrics.bandwidthLossRate).toBeGreaterThan(0);
      expect(metrics.entropyDelta).toBeGreaterThan(0);
      expect(metrics.potentialEnergy).toBeLessThan(0); // 引力束缚
    });
  });

  describe('EntropyHistory 熵增历史', () => {
    it('创建空历史', () => {
      const h = createEntropyHistory();
      expect(h.timestamps).toEqual([]);
      expect(h.values).toEqual([]);
      expect(h.maxLength).toBe(300);
    });

    it('记录数据点', () => {
      let h = createEntropyHistory();
      h = recordEntropy(h, 1000, 50);
      h = recordEntropy(h, 2000, 100);
      expect(h.timestamps).toEqual([1000, 2000]);
      expect(h.values).toEqual([50, 100]);
    });

    it('超过 maxLength 自动裁剪', () => {
      let h = createEntropyHistory(3);
      h = recordEntropy(h, 1000, 10);
      h = recordEntropy(h, 2000, 20);
      h = recordEntropy(h, 3000, 30);
      h = recordEntropy(h, 4000, 40);
      expect(h.timestamps.length).toBe(3);
      expect(h.values).toEqual([20, 30, 40]);
    });

    it('averageEntropy 平均熵增', () => {
      let h = createEntropyHistory();
      h = recordEntropy(h, 1000, 10);
      h = recordEntropy(h, 2000, 20);
      h = recordEntropy(h, 3000, 30);
      expect(averageEntropy(h)).toBe(20);
      expect(averageEntropy(h, 2)).toBe(25);
    });

    it('空历史平均熵增为零', () => {
      expect(averageEntropy(createEntropyHistory())).toBe(0);
    });

    it('peakEntropy 峰值熵增', () => {
      let h = createEntropyHistory();
      h = recordEntropy(h, 1000, 10);
      h = recordEntropy(h, 2000, 50);
      h = recordEntropy(h, 3000, 30);
      expect(peakEntropy(h)).toBe(50);
      expect(peakEntropy(h, 1)).toBe(30);
    });

    it('空历史峰值熵增为零', () => {
      expect(peakEntropy(createEntropyHistory())).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 集成测试: 完整物理循环
// ═══════════════════════════════════════════════════════════════════

describe('集成测试 — 完整物理循环', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('粒子在多节点引力场中运动, 副本互斥分散到不同节点', () => {
    // 两个节点, 两个同组副本粒子
    const nodes = [
      createGravityNode('n1', { x: 100, y: 300 }, { capacity: 1, bandwidth: 1 }),
      createGravityNode('n2', { x: 500, y: 300 }, { capacity: 1, bandwidth: 1 }),
    ];
    const particles: DataParticle[] = [
      makeParticle({ id: 'p1', position: { x: 300, y: 300 }, replicaId: 'R1', velocity: { x: -10, y: 0 } }),
      makeParticle({ id: 'p2', position: { x: 310, y: 300 }, replicaId: 'R1', velocity: { x: 10, y: 0 } }),
    ];
    let state = createDataGravityState(nodes, particles);

    // 运行 100 个 tick
    for (let i = 0; i < 100; i++) {
      state = updatePhysics(state, 16);
    }

    // 副本互斥 + 引力 → 两个粒子应该分开 (距离增加)
    const dist = distance(state.particles[0].position, state.particles[1].position);
    expect(dist).toBeGreaterThan(10); // 初始距离是 10, 应该更远
  });

  it('故障注入后粒子被排斥, 恢复后速度方向反转朝向节点', () => {
    const nodes = [
      createGravityNode('n1', { x: 300, y: 300 }, { capacity: 1, bandwidth: 1 }),
    ];
    const particles = [
      makeParticle({ id: 'p1', position: { x: 280, y: 300 }, velocity: { x: 0, y: 0 } }),
    ];
    let state = createDataGravityState(nodes, particles);

    // 正常引力: 粒子向节点移动 (x 增加方向)
    state = updatePhysics(state, 100);
    expect(state.particles[0].velocity.x).toBeGreaterThan(0);

    // 故障注入: 粒子被排斥 (x 减小方向)
    state = injectNodeFailure(state, 'n1');
    for (let i = 0; i < 100; i++) {
      state = updatePhysics(state, 16);
    }
    expect(state.particles[0].velocity.x).toBeLessThan(0);

    // 恢复: 引力重新吸引, 经过足够时间后速度方向应朝向节点
    state = recoverNode(state, 'n1');
    for (let i = 0; i < 500; i++) {
      state = updatePhysics(state, 16);
    }
    // 粒子应最终被吸引回来, 速度方向朝向节点 (正 x)
    expect(state.particles[0].velocity.x).toBeGreaterThan(0);
  });

  it('引力锚点吸引粒子后过期消失', () => {
    const particles = [
      makeParticle({ id: 'p1', position: { x: 100, y: 100 }, velocity: { x: 0, y: 0 } }),
    ];
    let state = createDataGravityState([], particles);

    // 放置锚点
    state = placeGravityAnchor(state, { x: 300, y: 100 }, { lifetimeMs: 160 });
    expect(state.anchors.length).toBe(1);

    // 运行几个 tick, 粒子应向锚点移动
    for (let i = 0; i < 5; i++) {
      state = updatePhysics(state, 16);
    }
    expect(state.particles[0].position.x).toBeGreaterThan(100);

    // 锚点过期
    for (let i = 0; i < 10; i++) {
      state = updatePhysics(state, 16);
    }
    expect(state.anchors.length).toBe(0);
  });

  it('Singularity 爆发后熵增飙升', () => {
    const particles: DataParticle[] = [];
    for (let i = 0; i < 10; i++) {
      particles.push(makeParticle({
        id: `p${i}`,
        position: { x: 200 + i * 10, y: 200 },
        velocity: { x: 0, y: 0 },
      }));
    }
    let state = createDataGravityState([], particles);

    // 计算爆发前动能
    const keBefore = computeKineticEnergy(state.particles);

    // 引爆奇点
    state = applySingularity(state, { x: 200, y: 200 });

    // 计算爆发后动能
    const keAfter = computeKineticEnergy(state.particles);
    expect(keAfter).toBeGreaterThan(keBefore);

    // 熵增应该很高
    const entropy = computeEntropyDelta(keAfter, keBefore, 0);
    expect(entropy).toBeGreaterThan(0);
  });

  it('EnergyMonitor 追踪完整物理循环的熵增历史', () => {
    const nodes = [
      createGravityNode('n1', { x: 300, y: 300 }, { capacity: 1, bandwidth: 1 }),
    ];
    const particles = [
      makeParticle({ id: 'p1', position: { x: 100, y: 300 }, velocity: { x: 50, y: 0 } }),
    ];
    let state = createDataGravityState(nodes, particles);
    let history = createEntropyHistory();
    let previousKE = computeKineticEnergy(state.particles);

    // 运行 10 个 tick, 记录每次的熵增
    for (let i = 0; i < 10; i++) {
      state = updatePhysics(state, 16);
      const metrics = computeEnergyMetrics(state, previousKE, 0.016);
      history = recordEntropy(history, i * 16, metrics.entropyDelta);
      previousKE = metrics.kineticEnergy;
    }

    expect(history.timestamps.length).toBe(10);
    expect(history.values.length).toBe(10);
    expect(averageEntropy(history)).toBeGreaterThan(0);
  });
});
