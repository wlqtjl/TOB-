'use client';

/**
 * ZBSFlowViz — ZBS 数据流可视化（五场景交互叙事）
 *
 * 用"故事讲述"方式替代物理粒子仿真：
 * 场景1: 文件写入 → 自动分块
 * 场景2: 数据分布到3个节点（可点击查看）
 * 场景3: 节点故障 → 自动恢复
 * 场景4: 副本数量可控（滑块）
 * 场景5: 读取路径选择
 *
 * 使用 framer-motion 驱动动画，无 Three.js 依赖
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, HardDrive, AlertTriangle, CheckCircle2,
  ChevronRight, ChevronLeft, FileText, Server,
  RefreshCw, Zap, Eye,
} from 'lucide-react';
import type { ZBSScene } from '@skillquest/types';
import { CHUNK_COLORS } from '@skillquest/types';

/* ────────────────── Constants ────────────────── */

const CHUNK_LABELS = ['C1', 'C2', 'C3', 'C4'];

const SCENES: ZBSScene[] = [
  { id: 1, title: '文件写入', description: '你的文件是怎么进入 ZBS 的', interactable: false },
  { id: 2, title: '数据分布', description: '三台机器各存了什么', interactable: true },
  { id: 3, title: '节点故障', description: '坏了一台会怎样', interactable: false },
  { id: 4, title: '副本策略', description: '副本数量你来决定', interactable: true },
  { id: 5, title: '数据读取', description: 'ZBS 怎么快速找到你的文件', interactable: false },
];

interface ZBSFlowVizProps {
  onComplete: () => void;
  courseId: string;
  levelId: string;
}

/* ────────────────── Data Block Component ────────────────── */

function DataBlock({ label, color, size = 40, className = '' }: {
  label: string; color: string; size?: number; className?: string;
}) {
  return (
    <motion.div
      className={`flex items-center justify-center rounded-lg font-mono text-xs font-bold text-white shadow-lg ${className}`}
      style={{ width: size, height: size, backgroundColor: color }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {label}
    </motion.div>
  );
}

/* ────────────────── Server Node Component ────────────────── */

type NodeStatus = 'normal' | 'active' | 'failed' | 'recovering' | 'recovered';

function ServerNode({ label, status, chunks, onClick, showDetail }: {
  label: string;
  status: NodeStatus;
  chunks: { label: string; color: string }[];
  onClick?: () => void;
  showDetail?: boolean;
}) {
  const statusStyles: Record<NodeStatus, { bg: string; border: string; icon: React.ReactNode }> = {
    normal: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: <Server className="text-emerald-500" size={24} /> },
    active: { bg: 'bg-blue-50', border: 'border-blue-300', icon: <Server className="text-blue-500" size={24} /> },
    failed: { bg: 'bg-red-50', border: 'border-red-300', icon: <AlertTriangle className="text-red-500" size={24} /> },
    recovering: { bg: 'bg-amber-50', border: 'border-amber-300', icon: <RefreshCw className="text-amber-500 animate-spin" size={24} /> },
    recovered: { bg: 'bg-emerald-50', border: 'border-emerald-400', icon: <CheckCircle2 className="text-emerald-500" size={24} /> },
  };

  const s = statusStyles[status];

  return (
    <motion.div
      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 ${s.bg} ${s.border} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
      onClick={onClick}
      animate={status === 'failed' ? { x: [0, -3, 3, -3, 0] } : {}}
      transition={status === 'failed' ? { duration: 0.4, repeat: 2 } : {}}
    >
      {s.icon}
      <span className="text-sm font-semibold text-gray-700">{label}</span>

      {/* Chunk indicators */}
      <div className="flex flex-wrap justify-center gap-1 mt-1">
        {chunks.map((c, i) => (
          <motion.div
            key={`${c.label}-${i}`}
            className="flex items-center justify-center rounded text-[10px] font-bold text-white"
            style={{ width: 28, height: 28, backgroundColor: c.color }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 300 }}
          >
            {c.label}
          </motion.div>
        ))}
      </div>

      {/* Detail tooltip */}
      {showDetail && (
        <motion.div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-xl z-10 whitespace-nowrap"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          存储了 {chunks.length} 个数据块：{chunks.map(c => c.label).join('、')}
        </motion.div>
      )}

      {status === 'failed' && (
        <motion.div
          className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <span className="text-white text-xs">✕</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ────────────────── Scene 1: File Write ────────────────── */

function Scene1() {
  const [phase, setPhase] = useState<'initial' | 'entering' | 'chunking' | 'done'>('initial');

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-md">
        假设你在电脑上保存了一个 PPT 文件，看看 ZBS 是怎么处理它的：
      </p>

      <div className="flex items-center gap-8">
        {/* Computer */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'initial' ? 1 : 0.5 }}
        >
          <Monitor className="text-gray-500" size={48} />
          <span className="text-xs text-gray-400">你的电脑</span>
        </motion.div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: phase !== 'initial' ? 1 : 0, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-indigo-400"
        >
          <ChevronRight size={32} />
        </motion.div>

        {/* ZBS cluster */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-8 py-6 min-w-[200px]">
          <span className="text-xs font-semibold text-indigo-600 tracking-wide">ZBS 集群</span>

          <AnimatePresence mode="wait">
            {(phase === 'initial' || phase === 'entering') && (
              <motion.div
                key="file"
                className="flex items-center gap-2"
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <FileText className="text-indigo-500" size={36} />
                <span className="text-sm text-gray-600">report.pptx</span>
              </motion.div>
            )}

            {(phase === 'chunking' || phase === 'done') && (
              <motion.div
                key="chunks"
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {CHUNK_LABELS.map((label, i) => (
                  <DataBlock
                    key={label}
                    label={label}
                    color={Object.values(CHUNK_COLORS)[i]}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {phase === 'initial' && (
        <motion.button
          className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setPhase('entering');
            setTimeout(() => setPhase('chunking'), 800);
            setTimeout(() => setPhase('done'), 1600);
          }}
        >
          点击保存文件
        </motion.button>
      )}

      {phase === 'done' && (
        <motion.div
          className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700 max-w-md text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✨ ZBS 会把你的文件自动切成小块（Chunk），分散存储到不同的机器上。
          这就是&ldquo;分布式存储&rdquo;的第一步！
        </motion.div>
      )}
    </div>
  );
}

/* ────────────────── Scene 2: Data Distribution ────────────────── */

function Scene2() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [distributed, setDistributed] = useState(false);

  const nodeData = [
    { label: '节点 A', chunks: [
      { label: 'C1', color: CHUNK_COLORS.chunk1 },
      { label: 'C2', color: CHUNK_COLORS.chunk2 },
      { label: 'C3', color: CHUNK_COLORS.chunk3 },
    ]},
    { label: '节点 B', chunks: [
      { label: 'C2', color: CHUNK_COLORS.chunk2 },
      { label: 'C3', color: CHUNK_COLORS.chunk3 },
      { label: 'C4', color: CHUNK_COLORS.chunk4 },
    ]},
    { label: '节点 C', chunks: [
      { label: 'C1', color: CHUNK_COLORS.chunk1 },
      { label: 'C4', color: CHUNK_COLORS.chunk4 },
      { label: 'C2', color: CHUNK_COLORS.chunk2 },
    ]},
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">
        你的文件被分成 4 块后，每块会存 2 份副本，分别放在不同的机器上。
        <span className="text-indigo-600 font-medium">（点击节点查看详情）</span>
      </p>

      {!distributed ? (
        <motion.button
          className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDistributed(true)}
        >
          开始分布
        </motion.button>
      ) : (
        <>
          <div className="flex gap-6">
            {nodeData.map((node) => (
              <ServerNode
                key={node.label}
                label={node.label}
                status={selectedNode === node.label ? 'active' : 'normal'}
                chunks={node.chunks}
                onClick={() => setSelectedNode(selectedNode === node.label ? null : node.label)}
                showDetail={selectedNode === node.label}
              />
            ))}
          </div>

          <motion.div
            className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            📦 你的文件被分成 4 块，每块存了 2 份，分别在不同的机器上。<br />
            即使你不知道哪台机器在运行，你的数据始终是完整的。
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ────────────────── Scene 3: Node Failure ────────────────── */

function Scene3() {
  const [phase, setPhase] = useState<'normal' | 'failing' | 'recovering' | 'recovered'>('normal');

  const getNodeAStatus = (): NodeStatus => {
    if (phase === 'failing' || phase === 'recovering' || phase === 'recovered') return 'failed';
    return 'normal';
  };

  const getNodeCStatus = (): NodeStatus => {
    if (phase === 'recovering') return 'recovering';
    if (phase === 'recovered') return 'recovered';
    return 'normal';
  };

  const nodeAChunks = [
    { label: 'C1', color: CHUNK_COLORS.chunk1 },
    { label: 'C2', color: CHUNK_COLORS.chunk2 },
    { label: 'C3', color: CHUNK_COLORS.chunk3 },
  ];

  const nodeBChunks = [
    { label: 'C2', color: CHUNK_COLORS.chunk2 },
    { label: 'C3', color: CHUNK_COLORS.chunk3 },
    { label: 'C4', color: CHUNK_COLORS.chunk4 },
  ];

  const nodeCChunks = phase === 'recovered' ? [
    { label: 'C1', color: CHUNK_COLORS.chunk1 },
    { label: 'C4', color: CHUNK_COLORS.chunk4 },
    { label: 'C2', color: CHUNK_COLORS.chunk2 },
    { label: 'C3', color: CHUNK_COLORS.chunk3 },
  ] : [
    { label: 'C1', color: CHUNK_COLORS.chunk1 },
    { label: 'C4', color: CHUNK_COLORS.chunk4 },
    { label: 'C2', color: CHUNK_COLORS.chunk2 },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">
        如果其中一台机器突然坏了，你的数据会丢吗？让我们来模拟一下。
      </p>

      <div className="flex gap-6">
        <ServerNode label="节点 A" status={getNodeAStatus()} chunks={phase === 'normal' ? nodeAChunks : []} />
        <ServerNode label="节点 B" status="normal" chunks={nodeBChunks} />
        <ServerNode label="节点 C" status={getNodeCStatus()} chunks={nodeCChunks} />
      </div>

      {/* Recovery progress bar */}
      {phase === 'recovering' && (
        <motion.div
          className="w-64 rounded-full bg-gray-200 h-3 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'easeInOut' }}
            onAnimationComplete={() => setPhase('recovered')}
          />
        </motion.div>
      )}

      {phase === 'recovering' && (
        <p className="text-sm text-amber-600 animate-pulse">⏳ 正在从其他节点复制数据，恢复副本...</p>
      )}

      {phase === 'normal' && (
        <motion.button
          className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setPhase('failing');
            setTimeout(() => setPhase('recovering'), 1500);
          }}
        >
          ⚡ 模拟节点 A 故障
        </motion.button>
      )}

      {phase === 'failing' && (
        <motion.div
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 max-w-lg text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          🚨 节点 A 故障了！别慌 — ZBS 正在自动检测副本不足...
        </motion.div>
      )}

      {phase === 'recovered' && (
        <motion.div
          className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✅ <strong>恢复完成！</strong>ZBS 自动检测到副本不足，立刻从其他机器复制一份补充。<br />
          你的应用全程无感知，数据完好无损。
        </motion.div>
      )}
    </div>
  );
}

/* ────────────────── Scene 4: Replica Control ────────────────── */

function Scene4() {
  const [replicaCount, setReplicaCount] = useState(3);

  const toleratedFailures = replicaCount - 1;
  const storageMultiplier = replicaCount;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">
        副本数量不是固定的，你可以根据业务需求自行选择。
        拖动滑块看看效果：
      </p>

      {/* Slider */}
      <div className="flex items-center gap-4 w-full max-w-md">
        <span className="text-sm text-gray-500">1份</span>
        <input
          type="range"
          min={1}
          max={5}
          value={replicaCount}
          onChange={(e) => setReplicaCount(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="text-sm text-gray-500">5份</span>
      </div>
      <div className="text-lg font-bold text-indigo-600">
        当前副本数：{replicaCount} 份 {replicaCount === 3 && <span className="text-sm font-normal text-emerald-500">（推荐）</span>}
      </div>

      {/* Nodes visualization */}
      <div className="flex gap-4">
        {['节点 A', '节点 B', '节点 C'].map((name) => (
          <div key={name} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 min-w-[80px]">
            <Server className="text-emerald-500" size={20} />
            <span className="text-xs text-gray-600">{name}</span>
            <div className="flex flex-wrap justify-center gap-1">
              {/* Each node holds (totalChunks × replicaCount / numberOfNodes) data blocks */}
              {Array.from({ length: Math.ceil((4 * replicaCount) / 3) }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-sm bg-indigo-400"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md w-full">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{toleratedFailures}</p>
          <p className="text-xs text-emerald-600">最多可坏几台机器</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{storageMultiplier}×</p>
          <p className="text-xs text-amber-600">存储空间占用</p>
        </div>
      </div>

      <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700 max-w-md text-center">
        💡 副本数越多 = 越安全，但占用空间也越多。深信服推荐生产环境使用 <strong>3 副本</strong>。
      </div>
    </div>
  );
}

/* ────────────────── Scene 5: Read Path ────────────────── */

function Scene5() {
  const [phase, setPhase] = useState<'idle' | 'routing' | 'reading' | 'done'>('idle');
  const [fastestNode, setFastestNode] = useState<string>('');

  const nodes = [
    { name: '节点 A', latency: 12 },
    { name: '节点 B', latency: 3 },
    { name: '节点 C', latency: 8 },
  ];

  const startRead = () => {
    setPhase('routing');
    // Simulate latency check
    setTimeout(() => {
      const fastest = nodes.reduce((a, b) => a.latency < b.latency ? a : b);
      setFastestNode(fastest.name);
      setPhase('reading');
      setTimeout(() => setPhase('done'), 1200);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">
        当你的应用需要读取文件时，ZBS 会自动选择延迟最低的节点来提供数据。
      </p>

      {/* Application request */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Zap className="text-blue-500" size={24} />
          <span className="text-xs text-blue-600">应用请求</span>
        </div>

        {phase !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ChevronRight className="text-gray-300" size={24} />
          </motion.div>
        )}

        {phase !== 'idle' && (
          <motion.div
            className="flex flex-col items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 p-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Eye className="text-indigo-500" size={24} />
            <span className="text-xs text-indigo-600">智能路由</span>
          </motion.div>
        )}
      </div>

      {/* Nodes with latency */}
      <div className="flex gap-6">
        {nodes.map((node) => (
          <motion.div
            key={node.name}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              fastestNode === node.name
                ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                : 'border-gray-200 bg-white'
            }`}
            animate={phase === 'routing' ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={phase === 'routing' ? { repeat: Infinity, duration: 0.8 } : {}}
          >
            <Server className={fastestNode === node.name ? 'text-emerald-500' : 'text-gray-400'} size={24} />
            <span className="text-sm text-gray-700">{node.name}</span>
            {phase !== 'idle' && (
              <motion.span
                className={`text-xs font-mono ${fastestNode === node.name ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {node.latency}ms
              </motion.span>
            )}
            {fastestNode === node.name && (
              <motion.span
                className="text-xs text-emerald-500 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ⚡ 最快
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {phase === 'idle' && (
        <motion.button
          className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startRead}
        >
          📖 发起读取请求
        </motion.button>
      )}

      {phase === 'done' && (
        <motion.div
          className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✅ 数据从延迟最低的 <strong>{fastestNode}</strong>（{nodes.find(n => n.name === fastestNode)?.latency}ms）读取完成！<br />
          ZBS 自动选择最快路径，让你的应用获得最佳性能。
        </motion.div>
      )}
    </div>
  );
}

/* ────────────────── Main Component ────────────────── */

export default function ZBSFlowViz({ onComplete }: ZBSFlowVizProps) {
  const [currentScene, setCurrentScene] = useState(0);

  const handleNext = useCallback(() => {
    if (currentScene < SCENES.length - 1) {
      setCurrentScene((prev) => prev + 1);
    }
  }, [currentScene]);

  const handlePrev = useCallback(() => {
    if (currentScene > 0) {
      setCurrentScene((prev) => prev - 1);
    }
  }, [currentScene]);

  const scene = SCENES[currentScene];

  const renderScene = () => {
    switch (scene.id) {
      case 1: return <Scene1 />;
      case 2: return <Scene2 />;
      case 3: return <Scene3 />;
      case 4: return <Scene4 />;
      case 5: return <Scene5 />;
      default: return null;
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              🎬 ZBS 数据流可视化
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              用 5 个场景理解分布式存储的工作原理
            </p>
          </div>
          <div className="flex items-center gap-2">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentScene(i)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  i === currentScene
                    ? 'bg-indigo-500 text-white shadow-md'
                    : i < currentScene
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scene title */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-600">
            场景 {scene.id}
          </span>
          <h3 className="text-base font-semibold text-gray-800">{scene.title}</h3>
          {scene.interactable && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-500 border border-blue-200">
              可交互
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{scene.description}</p>
      </div>

      {/* Scene content */}
      <div className="px-6 py-6 min-h-[320px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderScene()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentScene === 0}
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} /> 上一步
        </button>

        <span className="text-xs text-gray-400">
          {currentScene + 1} / {SCENES.length}
        </span>

        {currentScene < SCENES.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-sm"
          >
            下一步 <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition shadow-sm"
          >
            <CheckCircle2 size={16} /> 我看懂了，开始答题！
          </button>
        )}
      </div>
    </div>
  );
}
