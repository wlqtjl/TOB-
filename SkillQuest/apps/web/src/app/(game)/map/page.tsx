/**
 * 闯关地图页面 — 对标 Data Center 整体布局
 *
 * 核心视觉: Phaser.js 渲染的 DAG 知识图谱
 * - 关卡节点 (圆形/星形, 按状态变色)
 * - 粒子流 (沿 Bezier 曲线, 对标 packet-balls)
 * - 已通关: 金色光晕 / 当前: 脉冲 / 锁定: 灰色
 */

import type { LevelMapData, LevelMapNode, LevelMapEdge } from '@skillquest/types';

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

// 状态颜色映射
const STATUS_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  passed: { bg: 'bg-yellow-500/20', border: 'border-yellow-400', glow: 'shadow-yellow-400/50' },
  unlocked: { bg: 'bg-blue-500/20', border: 'border-blue-400', glow: 'shadow-blue-400/50' },
  in_progress: { bg: 'bg-orange-500/20', border: 'border-orange-400', glow: 'shadow-orange-400/50' },
  locked: { bg: 'bg-gray-800/50', border: 'border-gray-700', glow: '' },
  failed: { bg: 'bg-red-500/10', border: 'border-red-500/50', glow: '' },
};

const STAR_DISPLAY = ['', '⭐', '⭐⭐', '⭐⭐⭐'];

const TYPE_ICONS: Record<string, string> = {
  quiz: '📝',
  topology: '🔗',
  terminal: '💻',
  scenario: '🔍',
  ordering: '📋',
  matching: '🔀',
};

function LevelNodeComponent({ node }: { node: LevelMapNode }) {
  const colors = STATUS_COLORS[node.status] ?? STATUS_COLORS.locked;
  const isClickable = node.status !== 'locked';

  return (
    <div
      className={`
        absolute flex flex-col items-center gap-1 transition-all duration-300
        ${isClickable ? 'cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed'}
      `}
      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className={`
          relative w-16 h-16 rounded-full ${colors.bg} border-2 ${colors.border}
          flex items-center justify-center text-2xl
          ${colors.glow ? `shadow-lg ${colors.glow}` : ''}
        `}
      >
        {node.status === 'locked' ? '🔒' : TYPE_ICONS[node.type] ?? '📝'}
      </div>
      <span className="text-xs text-gray-300 text-center max-w-[100px] truncate">
        {node.title}
      </span>
      {node.stars > 0 && (
        <span className="text-xs">{STAR_DISPLAY[node.stars]}</span>
      )}
    </div>
  );
}

/** 粒子流边 (SVG line with dash animation for particle effect) */
function ParticleEdge({ edge, nodes }: { edge: LevelMapEdge; nodes: LevelMapNode[] }) {
  const fromNode = nodes.find((n) => n.levelId === edge.fromLevelId);
  const toNode = nodes.find((n) => n.levelId === edge.toLevelId);
  if (!fromNode || !toNode) return null;

  const strokeColor =
    edge.particleState === 'flowing'
      ? '#FFD700'
      : edge.particleState === 'pulsing'
        ? '#3996f6'
        : '#374151';

  const dashArray =
    edge.particleState === 'static' ? '4 8' : '8 4';

  const animClass =
    edge.particleState === 'flowing'
      ? 'particle-flow'
      : edge.particleState === 'pulsing'
        ? 'particle-pulse'
        : '';

  return (
    <line
      x1={fromNode.x}
      y1={fromNode.y}
      x2={toNode.x}
      y2={toNode.y}
      stroke={strokeColor}
      strokeWidth={edge.particleState === 'static' ? 1 : 2}
      strokeDasharray={dashArray}
      className={animClass}
      strokeLinecap="round"
    />
  );
}

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

      {/* 地图画布 */}
      <div className="relative mx-auto h-[500px] w-full max-w-[900px] rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* 粒子流边 (SVG层) */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <style>{`
              @keyframes dash-flow {
                to { stroke-dashoffset: -24; }
              }
              @keyframes dash-pulse {
                to { stroke-dashoffset: -24; }
              }
              .particle-flow {
                animation: dash-flow 2s linear infinite;
              }
              .particle-pulse {
                animation: dash-pulse 1s linear infinite;
              }
            `}</style>
          </defs>
          {mockMapData.edges.map((edge, i) => (
            <ParticleEdge key={i} edge={edge} nodes={mockMapData.nodes} />
          ))}
        </svg>

        {/* 关卡节点 */}
        {mockMapData.nodes.map((node) => (
          <LevelNodeComponent key={node.levelId} node={node} />
        ))}

        {/* 图例 */}
        <div className="absolute bottom-3 left-3 flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500/20" /> 已通关
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-blue-400 bg-blue-500/20" /> 可挑战
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-gray-700 bg-gray-800/50" /> 锁定
          </span>
        </div>
      </div>

      {/* 说明 */}
      <p className="mt-4 text-center text-xs text-gray-600">
        对标 Data Center 游戏的整体布局视图 · 金色粒子流 = 已完成路径 · 蓝色脉冲 = 可解锁路径
      </p>
    </div>
  );
}
