/**
 * 闯关地图页面 — Canvas 粒子流替代 SVG 虚线动画
 *
 * 核心变化: 使用 VisualScene 协议 + UniversalGameRenderer
 * - 金色粒子沿 Bezier 曲线流动 (已完成路径)
 * - 蓝色脉冲粒子 (可解锁路径)
 * - 灰色静态连线 (锁定路径)
 * - 所有效果通过同一个 Canvas 粒子引擎驱动
 */

'use client';

import type { LevelMapData } from '@skillquest/types';
import { mapAdapter } from '@skillquest/game-engine';
import UniversalGameRenderer from '../../../components/game/UniversalGameRenderer';

// Mock 数据: 华为 HCIA 课程闯关地图
const mockMapData: LevelMapData = {
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
};

// Convert map data → VisualScene via adapter (pure function)
const mapScene = mapAdapter(mockMapData);

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* 页头 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-300">🗺️ 闯关地图</h1>
          <p className="text-sm text-gray-500">华为 HCIA-Datacom · 8个关卡 · 3个已通关</p>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>⭐ 总星数: 8/24</span>
          <span>🔥 XP: 1,250</span>
          <span>📊 Level 5</span>
        </div>
      </div>

      {/* Canvas 粒子地图 — 替代 SVG stroke-dasharray */}
      <div className="mx-auto max-w-[900px]">
        <UniversalGameRenderer
          scene={mapScene}
          className="border border-gray-800 rounded-xl overflow-hidden"
          debug={false}
        />
      </div>

      {/* 图例 */}
      <div className="mx-auto mt-4 max-w-[900px] flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500/20" /> 已通关 (金色粒子流)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-blue-400 bg-blue-500/20" /> 可挑战 (蓝色脉冲)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-gray-700 bg-gray-800/50" /> 锁定
          </span>
        </div>
        <p className="text-xs text-gray-600">
          Canvas 粒子引擎 · 对标 Data Center packet-ball 效果
        </p>
      </div>
    </div>
  );
}
