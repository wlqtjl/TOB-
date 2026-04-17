'use client';

/**
 * StandardFlowGenerator — 标准数据流内容生成器
 *
 * 从 ZBSFlowViz 提炼而来的通用化可视化组件。
 * 可为任意分布式系统（ZBS / Ceph / iSCSI / CRUSH 等）生成
 * 五场景交互叙事内容，支持参数化配置。
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
import type { DataFlowTemplate, FlowScene } from '@skillquest/types';

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

/* ────────────────── Generic Scenes (driven by template) ────────────────── */

function WriteScene({ template }: { template: DataFlowTemplate }) {
  const [phase, setPhase] = useState<'initial' | 'entering' | 'chunking' | 'done'>('initial');
  const chunkLabels = Array.from({ length: template.totalChunks }, (_, i) => `C${i + 1}`);
  const colors = Object.values(template.chunkColors);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-md">
        {template.texts.writeDescription}
      </p>
      <div className="flex items-center gap-8">
        <motion.div className="flex flex-col items-center gap-2" initial={{ opacity: 1 }} animate={{ opacity: phase === 'initial' ? 1 : 0.5 }}>
          <Monitor className="text-gray-500" size={48} />
          <span className="text-xs text-gray-400">客户端</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: phase !== 'initial' ? 1 : 0, x: 0 }} transition={{ delay: 0.3 }} className="text-indigo-400">
          <ChevronRight size={32} />
        </motion.div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-8 py-6 min-w-[200px]">
          <span className="text-xs font-semibold text-indigo-600 tracking-wide">{template.name} 集群</span>
          <AnimatePresence mode="wait">
            {(phase === 'initial' || phase === 'entering') && (
              <motion.div key="file" className="flex items-center gap-2" initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 200 }}>
                <FileText className="text-indigo-500" size={36} />
                <span className="text-sm text-gray-600">data.file</span>
              </motion.div>
            )}
            {(phase === 'chunking' || phase === 'done') && (
              <motion.div key="chunks" className="flex gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {chunkLabels.map((label, i) => (
                  <DataBlock key={label} label={label} color={colors[i % colors.length]} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {phase === 'initial' && (
        <motion.button className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setPhase('entering'); setTimeout(() => setPhase('chunking'), 800); setTimeout(() => setPhase('done'), 1600); }}>
          点击写入数据
        </motion.button>
      )}
      {phase === 'done' && (
        <motion.div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700 max-w-md text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          ✨ 系统自动将数据切成 {template.totalChunks} 个小块（Chunk），分散存储到不同节点。
        </motion.div>
      )}
    </div>
  );
}

function DistributionScene({ template }: { template: DataFlowTemplate }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [distributed, setDistributed] = useState(false);
  const colors = Object.values(template.chunkColors);

  const nodeData = template.nodes.filter(n => n.role === 'storage').map(node => ({
    label: node.label,
    chunks: node.chunks.map((ch, i) => {
      const parsed = parseInt(ch.replace(/\D/g, ''), 10);
      const colorIndex = Number.isNaN(parsed) ? i : parsed - 1;
      return { label: ch, color: colors[colorIndex % colors.length] || colors[0] };
    }),
  }));

  // If no storage nodes defined, generate defaults
  const displayNodes = nodeData.length > 0 ? nodeData : Array.from({ length: template.nodeCount }, (_, i) => {
    const nodeName = `节点 ${String.fromCharCode(65 + i)}`;
    const totalChunks = template.totalChunks;
    const chunksPerNode = Math.ceil((totalChunks * template.replicaCount) / template.nodeCount);
    const chunks = Array.from({ length: chunksPerNode }, (_, j) => ({
      label: `C${(j % totalChunks) + 1}`,
      color: colors[j % colors.length],
    }));
    return { label: nodeName, chunks };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">
        {template.texts.distributionDescription}
        <span className="text-indigo-600 font-medium">（点击节点查看详情）</span>
      </p>
      {!distributed ? (
        <motion.button className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDistributed(true)}>
          开始分布
        </motion.button>
      ) : (
        <>
          <div className="flex gap-6 flex-wrap justify-center">
            {displayNodes.map((node) => (
              <ServerNode key={node.label} label={node.label} status={selectedNode === node.label ? 'active' : 'normal'} chunks={node.chunks} onClick={() => setSelectedNode(selectedNode === node.label ? null : node.label)} showDetail={selectedNode === node.label} />
            ))}
          </div>
          <motion.div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            📦 数据被分成 {template.totalChunks} 块，每块存了 {template.replicaCount} 份，分别在不同节点上。
          </motion.div>
        </>
      )}
    </div>
  );
}

function FailureScene({ template }: { template: DataFlowTemplate }) {
  const [phase, setPhase] = useState<'normal' | 'failing' | 'recovering' | 'recovered'>('normal');
  const colors = Object.values(template.chunkColors);
  const nodeNames = Array.from({ length: template.nodeCount }, (_, i) => `节点 ${String.fromCharCode(65 + i)}`);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">{template.texts.failureDescription}</p>
      <div className="flex gap-6 flex-wrap justify-center">
        {nodeNames.map((name, i) => {
          let status: NodeStatus = 'normal';
          if (i === 0) {
            if (phase === 'failing' || phase === 'recovering' || phase === 'recovered') status = 'failed';
          }
          if (i === nodeNames.length - 1) {
            if (phase === 'recovering') status = 'recovering';
            if (phase === 'recovered') status = 'recovered';
          }
          const baseChunkCount = Math.ceil(template.totalChunks / template.nodeCount);
          const extraRecoveryChunk = (phase === 'recovered' && i === nodeNames.length - 1) ? 1 : 0;
          const chunks = i === 0 && phase !== 'normal' ? [] :
            Array.from({ length: baseChunkCount + extraRecoveryChunk }, (_, j) => ({
              label: `C${(j % template.totalChunks) + 1}`,
              color: colors[j % colors.length],
            }));
          return <ServerNode key={name} label={name} status={status} chunks={chunks} />;
        })}
      </div>
      {phase === 'recovering' && (
        <motion.div className="w-64 rounded-full bg-gray-200 h-3 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'easeInOut' }} onAnimationComplete={() => setPhase('recovered')} />
        </motion.div>
      )}
      {phase === 'recovering' && <p className="text-sm text-amber-600 animate-pulse">⏳ 正在从其他节点复制数据，恢复副本...</p>}
      {phase === 'normal' && (
        <motion.button className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-md" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setPhase('failing'); setTimeout(() => setPhase('recovering'), 1500); }}>
          ⚡ 模拟 {nodeNames[0]} 故障
        </motion.button>
      )}
      {phase === 'failing' && (
        <motion.div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 max-w-lg text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          🚨 {nodeNames[0]} 故障！系统正在自动检测副本不足...
        </motion.div>
      )}
      {phase === 'recovered' && (
        <motion.div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          ✅ <strong>恢复完成！</strong>系统自动检测到副本不足，立刻从其他节点复制补充。业务全程无感知。
        </motion.div>
      )}
    </div>
  );
}

function ReplicaScene({ template }: { template: DataFlowTemplate }) {
  const [replicaCount, setReplicaCount] = useState(template.replicaCount);
  const toleratedFailures = replicaCount - 1;
  const storageMultiplier = replicaCount;
  const nodeNames = Array.from({ length: template.nodeCount }, (_, i) => `节点 ${String.fromCharCode(65 + i)}`);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">{template.texts.replicaDescription}</p>
      <div className="flex items-center gap-4 w-full max-w-md">
        <span className="text-sm text-gray-500">1份</span>
        <input type="range" min={1} max={5} value={replicaCount} onChange={(e) => setReplicaCount(Number(e.target.value))} className="flex-1 accent-indigo-500" />
        <span className="text-sm text-gray-500">5份</span>
      </div>
      <div className="text-lg font-bold text-indigo-600">
        当前副本数：{replicaCount} 份 {replicaCount === template.replicaCount && <span className="text-sm font-normal text-emerald-500">（推荐）</span>}
      </div>
      <div className="flex gap-4 flex-wrap justify-center">
        {nodeNames.map((name) => (
          <div key={name} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 min-w-[80px]">
            <Server className="text-emerald-500" size={20} />
            <span className="text-xs text-gray-600">{name}</span>
            <div className="flex flex-wrap justify-center gap-1">
              {Array.from({ length: Math.ceil((template.totalChunks * replicaCount) / template.nodeCount) }).map((_, i) => (
                <motion.div key={i} className="w-3 h-3 rounded-sm bg-indigo-400" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
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
    </div>
  );
}

function ReadScene({ template }: { template: DataFlowTemplate }) {
  const [phase, setPhase] = useState<'idle' | 'routing' | 'reading' | 'done'>('idle');
  const [fastestNode, setFastestNode] = useState<string>('');
  const nodes = Array.from({ length: template.nodeCount }, (_, i) => ({
    name: `节点 ${String.fromCharCode(65 + i)}`,
    latency: Math.floor(Math.random() * 20) + 2,
  }));

  // Stable latency values — pick once
  const [stableNodes] = useState(nodes);

  const startRead = () => {
    setPhase('routing');
    setTimeout(() => {
      const fastest = stableNodes.reduce((a, b) => a.latency < b.latency ? a : b);
      setFastestNode(fastest.name);
      setPhase('reading');
      setTimeout(() => setPhase('done'), 1200);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-center text-gray-600 text-sm max-w-lg">{template.texts.readDescription}</p>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Zap className="text-blue-500" size={24} />
          <span className="text-xs text-blue-600">应用请求</span>
        </div>
        {phase !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ChevronRight className="text-gray-300" size={24} /></motion.div>
        )}
        {phase !== 'idle' && (
          <motion.div className="flex flex-col items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 p-3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <Eye className="text-indigo-500" size={24} />
            <span className="text-xs text-indigo-600">智能路由</span>
          </motion.div>
        )}
      </div>
      <div className="flex gap-6 flex-wrap justify-center">
        {stableNodes.map((node) => (
          <motion.div key={node.name} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${fastestNode === node.name ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100' : 'border-gray-200 bg-white'}`} animate={phase === 'routing' ? { opacity: [0.5, 1, 0.5] } : {}} transition={phase === 'routing' ? { repeat: Infinity, duration: 0.8 } : {}}>
            <Server className={fastestNode === node.name ? 'text-emerald-500' : 'text-gray-400'} size={24} />
            <span className="text-sm text-gray-700">{node.name}</span>
            {phase !== 'idle' && (
              <motion.span className={`text-xs font-mono ${fastestNode === node.name ? 'text-emerald-600 font-bold' : 'text-gray-400'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {node.latency}ms
              </motion.span>
            )}
            {fastestNode === node.name && <motion.span className="text-xs text-emerald-500 font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>⚡ 最快</motion.span>}
          </motion.div>
        ))}
      </div>
      {phase === 'idle' && (
        <motion.button className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors shadow-md" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startRead}>
          📖 发起读取请求
        </motion.button>
      )}
      {phase === 'done' && (
        <motion.div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 max-w-lg text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          ✅ 数据从延迟最低的 <strong>{fastestNode}</strong>（{stableNodes.find(n => n.name === fastestNode)?.latency}ms）读取完成！
        </motion.div>
      )}
    </div>
  );
}

/* ────────────────── Main Component ────────────────── */

interface StandardFlowGeneratorProps {
  template: DataFlowTemplate;
  /** Preview mode hides navigation complete button */
  previewMode?: boolean;
  onComplete?: () => void;
}

export default function StandardFlowGenerator({ template, previewMode = false, onComplete }: StandardFlowGeneratorProps) {
  const [currentScene, setCurrentScene] = useState(0);

  const scenes = template.scenes;

  const handleNext = useCallback(() => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene((prev) => prev + 1);
    }
  }, [currentScene, scenes.length]);

  const handlePrev = useCallback(() => {
    if (currentScene > 0) {
      setCurrentScene((prev) => prev - 1);
    }
  }, [currentScene]);

  const scene = scenes[currentScene];

  const renderScene = () => {
    switch (scene.id) {
      case 1: return <WriteScene template={template} />;
      case 2: return <DistributionScene template={template} />;
      case 3: return <FailureScene template={template} />;
      case 4: return <ReplicaScene template={template} />;
      case 5: return <ReadScene template={template} />;
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
              🎬 {template.name} 数据流可视化
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              用 {scenes.length} 个场景理解 {template.name} 的工作原理
            </p>
          </div>
          <div className="flex items-center gap-2">
            {scenes.map((s, i) => (
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
          {currentScene + 1} / {scenes.length}
        </span>

        {currentScene < scenes.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-sm"
          >
            下一步 <ChevronRight size={16} />
          </button>
        ) : !previewMode && onComplete ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition shadow-sm"
          >
            <CheckCircle2 size={16} /> 完成预览
          </button>
        ) : (
          <span className="text-xs text-emerald-500 font-medium">✅ 预览完成</span>
        )}
      </div>
    </div>
  );
}
