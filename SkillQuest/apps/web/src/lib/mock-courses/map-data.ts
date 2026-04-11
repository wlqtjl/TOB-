/**
 * Map data for each course — multi-vendor
 */

import type { LevelMapData } from '@skillquest/types';

const MAP_DATA: Record<string, LevelMapData> = {
  // ─── 华为 HCIA ──────────────────────────────────────────────────
  'huawei-hcia-datacom': {
    courseId: 'huawei-hcia-datacom',
    nodes: [
      { levelId: 'l1', title: '网络基础概念', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: 'OSI七层模型', type: 'quiz', status: 'passed', stars: 2, x: 400, y: 80 },
      { levelId: 'l3', title: 'TCP/IP协议栈', type: 'quiz', status: 'passed', stars: 3, x: 600, y: 120 },
      { levelId: 'l4', title: 'VLAN配置实验', type: 'topology', status: 'unlocked', stars: 0, x: 350, y: 250 },
      { levelId: 'l5', title: 'VRP命令行基础', type: 'terminal', status: 'unlocked', stars: 0, x: 550, y: 230 },
      { levelId: 'l6', title: 'STP协议原理', type: 'quiz', status: 'locked', stars: 0, x: 200, y: 380 },
      { levelId: 'l7', title: 'OSPF路由配置', type: 'topology', status: 'locked', stars: 0, x: 450, y: 400 },
      { levelId: 'l8', title: '故障排查实战', type: 'scenario', status: 'locked', stars: 0, x: 650, y: 370 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l4', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l4', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l5', particleState: 'pulsing' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'pulsing' },
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
      { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'flowing' },
      { fromLevelId: 'l4', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l8', particleState: 'static' },
    ],
  },

  // ─── 深信服超融合 HCI ────────────────────────────────────────────
  'sangfor-hci': {
    courseId: 'sangfor-hci',
    nodes: [
      { levelId: 'l1', title: '超融合架构概述', type: 'quiz', status: 'passed', stars: 2, x: 200, y: 100 },
      { levelId: 'l2', title: 'aSAN分布式存储', type: 'quiz', status: 'passed', stars: 3, x: 400, y: 80 },
      { levelId: 'l3', title: '虚拟机创建与调度', type: 'topology', status: 'unlocked', stars: 0, x: 600, y: 120 },
      { levelId: 'l4', title: '网络虚拟化配置', type: 'topology', status: 'unlocked', stars: 0, x: 350, y: 250 },
      { levelId: 'l5', title: 'HCI命令行管理', type: 'terminal', status: 'locked', stars: 0, x: 550, y: 230 },
      { levelId: 'l6', title: '高可用与故障迁移', type: 'scenario', status: 'locked', stars: 0, x: 200, y: 380 },
      { levelId: 'l7', title: '备份与容灾策略', type: 'quiz', status: 'locked', stars: 0, x: 450, y: 400 },
      { levelId: 'l8', title: '超融合故障排查', type: 'scenario', status: 'locked', stars: 0, x: 650, y: 370 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l3', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l3', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l4', particleState: 'pulsing' },
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'flowing' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l3', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l6', toLevelId: 'l8', particleState: 'static' },
      { fromLevelId: 'l7', toLevelId: 'l8', particleState: 'static' },
    ],
  },

  // ─── 安超云 OS ──────────────────────────────────────────────────
  'anchao-cloud': {
    courseId: 'anchao-cloud',
    nodes: [
      { levelId: 'l1', title: '安超云平台概述', type: 'quiz', status: 'passed', stars: 3, x: 200, y: 100 },
      { levelId: 'l2', title: '云主机生命周期', type: 'ordering', status: 'unlocked', stars: 0, x: 400, y: 80 },
      { levelId: 'l3', title: '存储池与卷管理', type: 'quiz', status: 'unlocked', stars: 0, x: 600, y: 120 },
      { levelId: 'l4', title: '虚拟网络配置', type: 'topology', status: 'locked', stars: 0, x: 350, y: 250 },
      { levelId: 'l5', title: '安超云CLI操作', type: 'terminal', status: 'locked', stars: 0, x: 550, y: 230 },
      { levelId: 'l6', title: '资源调度策略', type: 'matching', status: 'locked', stars: 0, x: 200, y: 380 },
      { levelId: 'l7', title: '监控与告警配置', type: 'scenario', status: 'locked', stars: 0, x: 450, y: 400 },
      { levelId: 'l8', title: '云平台故障演练', type: 'scenario', status: 'locked', stars: 0, x: 650, y: 370 },
    ],
    edges: [
      { fromLevelId: 'l1', toLevelId: 'l2', particleState: 'pulsing' },
      { fromLevelId: 'l1', toLevelId: 'l3', particleState: 'pulsing' },
      { fromLevelId: 'l2', toLevelId: 'l4', particleState: 'static' },
      { fromLevelId: 'l3', toLevelId: 'l4', particleState: 'static' },
      { fromLevelId: 'l3', toLevelId: 'l5', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l6', particleState: 'static' },
      { fromLevelId: 'l4', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l5', toLevelId: 'l7', particleState: 'static' },
      { fromLevelId: 'l6', toLevelId: 'l8', particleState: 'static' },
      { fromLevelId: 'l7', toLevelId: 'l8', particleState: 'static' },
    ],
  },
};

export function getMapData(courseId: string): LevelMapData | null {
  return MAP_DATA[courseId] ?? null;
}
