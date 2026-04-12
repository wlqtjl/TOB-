/**
 * Map data for each course — single-tenant B2B (SmartX demo)
 */

import type { LevelMapData } from '@skillquest/types';

const MAP_DATA: Record<string, LevelMapData> = {
  // ─── SMTX OS 超融合部署 ──────────────────────────────────────────
  'smartx-halo': {
    courseId: 'smartx-halo',
    nodes: [
      { levelId: 'l1', title: 'SMTX OS 架构概述', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: 'ZBS 分布式存储', type: 'quiz', status: 'passed', stars: 3, x: 400, y: 80 },
      { levelId: 'l3', title: 'ELF 虚拟化引擎', type: 'quiz', status: 'passed', stars: 2, x: 600, y: 120 },
      { levelId: 'l4', title: 'CloudTower 集群管理', type: 'topology', status: 'passed', stars: 3, x: 350, y: 250 },
      { levelId: 'l5', title: 'HALO 网络配置', type: 'topology', status: 'unlocked', stars: 0, x: 550, y: 230 },
      { levelId: 'l6', title: 'ZBS 数据保护与快照', type: 'matching', status: 'unlocked', stars: 0, x: 200, y: 380 },
      { levelId: 'l7', title: '集群扩容与迁移', type: 'scenario', status: 'locked', stars: 0, x: 450, y: 400 },
      { levelId: 'l8', title: 'HALO 故障排查实战', type: 'scenario', status: 'locked', stars: 0, x: 650, y: 370 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
      { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'flowing' },
      { fromLevelId: 'l1', toLevelId: 'l4', particleState: 'flowing' },
      { fromLevelId: 'l3', toLevelId: 'l4', particleState: 'flowing' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l6', particleState: 'pulsing' },
      { fromLevelId: 'l4', toLevelId: 'l5', particleState: 'pulsing' },
      { fromLevelId: 'l5', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l6', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l7', toLevelId: 'l8', particleState: 'static' },
    ],
  },

  // ─── VMware 迁移实战 ──────────────────────────────────────────────
  'smartx-migration': {
    courseId: 'smartx-migration',
    nodes: [
      { levelId: 'l1', title: '迁移评估与兼容性检查', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: 'V2V 工具使用', type: 'ordering', status: 'passed', stars: 2, x: 450, y: 80 },
      { levelId: 'l3', title: '虚拟机迁移步骤', type: 'ordering', status: 'unlocked', stars: 0, x: 700, y: 120 },
      { levelId: 'l4', title: '存储迁移策略', type: 'matching', status: 'unlocked', stars: 0, x: 350, y: 260 },
      { levelId: 'l5', title: '迁移后验证', type: 'terminal', status: 'locked', stars: 0, x: 550, y: 260 },
      { levelId: 'l6', title: '迁移故障排查', type: 'scenario', status: 'locked', stars: 0, x: 450, y: 400 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
      { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'pulsing' },
      { fromLevelId: 'l1', toLevelId: 'l4', particleState: 'pulsing' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l6', particleState: 'static' },
    ],
  },

  // ─── ZBS 分布式存储原理 ──────────────────────────────────────────
  'smartx-zbs': {
    courseId: 'smartx-zbs',
    nodes: [
      { levelId: 'l1', title: 'ZBS 整体架构', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: '数据分布与一致性', type: 'quiz', status: 'passed', stars: 2, x: 400, y: 80 },
      { levelId: 'l3', title: '副本策略配置', type: 'matching', status: 'passed', stars: 3, x: 600, y: 120 },
      { levelId: 'l4', title: '存储池管理', type: 'topology', status: 'unlocked', stars: 0, x: 350, y: 250 },
      { levelId: 'l5', title: 'ZBS CLI 运维', type: 'terminal', status: 'unlocked', stars: 0, x: 550, y: 230 },
      { levelId: 'l6', title: '故障恢复与重建', type: 'scenario', status: 'locked', stars: 0, x: 200, y: 380 },
      { levelId: 'l7', title: '性能诊断', type: 'scenario', status: 'locked', stars: 0, x: 450, y: 400 },
      { levelId: 'l8', title: 'ZBS 高级调优', type: 'vm_placement', status: 'locked', stars: 0, x: 650, y: 370 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
      { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'flowing' },
      { fromLevelId: 'l1', toLevelId: 'l4', particleState: 'pulsing' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'pulsing' },
      { fromLevelId: 'l4', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l6', toLevelId: 'l8', particleState: 'static' },
      { fromLevelId: 'l7', toLevelId: 'l8', particleState: 'static' },
    ],
  },

  // ─── CloudTower 运维管理 ──────────────────────────────────────────
  'smartx-cloudtower': {
    courseId: 'smartx-cloudtower',
    nodes: [
      { levelId: 'l1', title: 'CloudTower 架构与部署', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: '多集群纳管', type: 'topology', status: 'unlocked', stars: 0, x: 450, y: 80 },
      { levelId: 'l3', title: '监控告警配置', type: 'matching', status: 'unlocked', stars: 0, x: 700, y: 120 },
      { levelId: 'l4', title: '自动化运维策略', type: 'ordering', status: 'locked', stars: 0, x: 350, y: 260 },
      { levelId: 'l5', title: 'API 集成开发', type: 'terminal', status: 'locked', stars: 0, x: 550, y: 260 },
      { levelId: 'l6', title: '运维故障处理', type: 'scenario', status: 'locked', stars: 0, x: 450, y: 400 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'pulsing' },
      { fromLevelId: 'l1', toLevelId: 'l3', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l4', particleState: 'static' },
      { fromLevelId: 'l3', toLevelId: 'l4', particleState: 'static' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l6', particleState: 'static' },
    ],
  },
};

export function getMapData(courseId: string): LevelMapData | null {
  return MAP_DATA[courseId] ?? null;
}
