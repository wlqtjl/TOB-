'use client';

/**
 * SparkMigrationLevel — SmartX 替换 VMware 沉浸式关卡
 *
 * 3 phases: legacy → migration → smartx
 * Each phase has its own 3DGS scene + hotspots.
 * Clicking hotspots triggers quiz/dragdrop/info/comparison modals.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, XCircle, ChevronRight, Trophy, AlertTriangle,
} from 'lucide-react';
import type { Spark3DGSLevel, SparkMigrationPhase, SparkHotspot } from '@skillquest/types';
import Spark3DGSScene from './Spark3DGSScene';

interface SparkMigrationLevelProps {
  level: Spark3DGSLevel;
  onComplete: (score: number, stars: number) => void;
  onAnswer?: (hotspotId: string, correct: boolean) => void;
}

export default function SparkMigrationLevel({
  level,
  onComplete,
  onAnswer,
}: SparkMigrationLevelProps) {
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [answered, setAnswered] = useState(new Set<string>());
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<SparkHotspot | null>(null);
  const [userAnswer, setUserAnswer] = useState<any>(null);

  const currentPhase = level.phases[currentPhaseIdx];
  const totalHotspots = level.phases.reduce((sum, p) => sum + p.hotspots.length, 0);
  const allAnswered = currentPhase.hotspots.every((h) => answered.has(h.id));

  const handleHotspotClick = useCallback((hotspot: SparkHotspot) => {
    if (answered.has(hotspot.id)) return; // Already answered
    setSelectedHotspot(hotspot);
    setUserAnswer(null);
  }, [answered]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!selectedHotspot) return;
    const newAnswered = new Set(answered);
    newAnswered.add(selectedHotspot.id);
    setAnswered(newAnswered);
    if (correct) setCorrectCount(correctCount + 1);
    if (onAnswer) onAnswer(selectedHotspot.id, correct);
    setTimeout(() => setSelectedHotspot(null), 1200);
  }, [selectedHotspot, answered, correctCount, onAnswer]);

  const handleNextPhase = useCallback(() => {
    if (currentPhaseIdx < level.phases.length - 1) {
      setCurrentPhaseIdx(currentPhaseIdx + 1);
    } else {
      const score = Math.round((correctCount / totalHotspots) * 100);
      const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
      onComplete(score, stars);
    }
  }, [currentPhaseIdx, level.phases.length, correctCount, totalHotspots, onComplete]);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">{currentPhase.title}</h2>
          <p className="text-sm text-slate-400">{currentPhase.subtitle}</p>
        </div>
        <div className="text-sm text-slate-300">
          阶段 {currentPhaseIdx + 1} / {level.phases.length} · 完成 {answered.size}/{totalHotspots}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* 3D Scene */}
        <div className="flex-1 relative">
          <Spark3DGSScene
            scene={{
              id: currentPhase.sceneId,
              name: currentPhase.title,
              description: currentPhase.subtitle,
              radUrl: null,
              procedural: true,
              phase: currentPhase.phase,
              createdAt: new Date().toISOString(),
            }}
            hotspots={currentPhase.hotspots}
            onHotspotClick={handleHotspotClick}
            particleFlow={currentPhase.phase === 'migration'}
            className="h-full"
          />
        </div>

        {/* Side panel */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-bold mb-3 text-slate-300">📍 热点列表</h3>
          <div className="space-y-2">
            {currentPhase.hotspots.map((h) => {
              const done = answered.has(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => handleHotspotClick(h)}
                  disabled={done}
                  className={`w-full text-left p-3 rounded border transition ${
                    done
                      ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 border-slate-600 hover:border-blue-500 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {done ? <CheckCircle2 size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full bg-blue-500" />}
                    <span className="text-sm font-medium">{h.label}</span>
                  </div>
                  {h.description && <p className="text-xs text-slate-400 mt-1">{h.description}</p>}
                </button>
              );
            })}
          </div>

          {/* Pain points (phase 1) */}
          {currentPhase.painPoints && currentPhase.painPoints.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-2 text-slate-300 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                传统架构痛点
              </h3>
              <ul className="space-y-1 text-xs text-slate-400">
                {currentPhase.painPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Migration pairs (phase 2) */}
          {currentPhase.phase === 'migration' && (
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-2 text-slate-300">🔄 组件映射</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-slate-900 rounded">
                  <span className="text-slate-400">VMFS Datastore</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <span className="text-blue-400">ZBS Volume</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-900 rounded">
                  <span className="text-slate-400">vMotion</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <span className="text-blue-400">ELF Live Migration</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-900 rounded">
                  <span className="text-slate-400">vCenter</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <span className="text-blue-400">CloudTower</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-900 rounded">
                  <span className="text-slate-400">ESXi Host</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <span className="text-blue-400">SMTX OS Node</span>
                </div>
              </div>
            </div>
          )}

          {/* IOPS comparison (phase 3) */}
          {currentPhase.phase === 'smartx' && (
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-3 text-slate-300">📊 性能对比</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">迁移前 (VMware)</div>
                  <div className="bg-slate-900 rounded overflow-hidden">
                    <div className="bg-red-600 h-6 flex items-center px-2 text-xs font-mono" style={{ width: '18%' }}>
                      12k IOPS
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">迁移后 (SmartX)</div>
                  <div className="bg-slate-900 rounded overflow-hidden">
                    <div className="bg-green-600 h-6 flex items-center px-2 text-xs font-mono" style={{ width: '100%' }}>
                      68k IOPS
                    </div>
                  </div>
                </div>
                <div className="text-xs text-green-400 font-medium">
                  ↑ 5.7x 性能提升
                </div>
              </div>
            </div>
          )}

          {/* Next button */}
          <div className="mt-6">
            <button
              onClick={handleNextPhase}
              disabled={!allAnswered}
              className={`w-full py-2 px-4 rounded font-medium transition flex items-center justify-center gap-2 ${
                allAnswered
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {currentPhaseIdx < level.phases.length - 1 ? (
                <>下一阶段 <ChevronRight size={16} /></>
              ) : (
                <>完成关卡 <Trophy size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hotspot modal */}
      <AnimatePresence>
        {selectedHotspot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            onClick={() => setSelectedHotspot(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold">{selectedHotspot.label}</h3>
                <button onClick={() => setSelectedHotspot(null)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {selectedHotspot.description && (
                <p className="text-sm text-slate-300 mb-4">{selectedHotspot.description}</p>
              )}

              {renderHotspotContent(selectedHotspot, userAnswer, setUserAnswer, handleAnswer)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helper: render hotspot content ──────────────────────────────────

function renderHotspotContent(
  hotspot: SparkHotspot,
  userAnswer: any,
  setUserAnswer: (a: any) => void,
  handleAnswer: (correct: boolean) => void,
): React.ReactNode {
  const payload = hotspot.payload || {};

  if (hotspot.kind === 'quiz' && payload.question) {
    const options = payload.options || [];
    const correct = (payload.correct || []) as number[];
    return (
      <div>
        <p className="text-sm font-medium mb-3">{String(payload.question)}</p>
        <div className="space-y-2">
          {(options as string[]).map((opt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => {
                setUserAnswer(idx);
                setTimeout(() => handleAnswer(correct.includes(idx)), 300);
              }}
              className="w-full text-left p-3 rounded bg-slate-900 hover:bg-slate-700 border border-slate-600 transition text-sm"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (hotspot.kind === 'comparison' && payload.before && payload.after) {
    return (
      <div>
        <p className="text-sm font-medium mb-3">性能对比</p>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded">
            <span className="text-slate-400">迁移前</span>
            <span className="font-mono text-red-400">{String(payload.before)} {String(payload.metric || 'IOPS')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded">
            <span className="text-slate-400">迁移后</span>
            <span className="font-mono text-green-400">{String(payload.after)} {String(payload.metric || 'IOPS')}</span>
          </div>
        </div>
        <button
          onClick={() => handleAnswer(true)}
          className="w-full py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition"
        >
          确认了解
        </button>
      </div>
    );
  }

  if (hotspot.kind === 'info') {
    return (
      <div>
        <button
          onClick={() => handleAnswer(true)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition"
        >
          我知道了
        </button>
      </div>
    );
  }

  if (hotspot.kind === 'dragdrop' && payload.pairs) {
    return (
      <div>
        <p className="text-sm font-medium mb-3">V2V 组件映射</p>
        <div className="space-y-2 mb-4">
          {(payload.pairs as any[]).map((pair, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-slate-900 rounded">
              <span className="flex-1 text-slate-400">{pair.from}</span>
              <span className="text-slate-600">→</span>
              <span className="flex-1 text-blue-400">{pair.to}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => handleAnswer(true)}
          className="w-full py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition"
        >
          确认映射
        </button>
      </div>
    );
  }

  if (hotspot.kind === 'pain-point') {
    return (
      <div>
        {renderHotspotContent({ ...hotspot, kind: 'quiz' }, userAnswer, setUserAnswer, handleAnswer)}
      </div>
    );
  }

  return (
    <button
      onClick={() => handleAnswer(true)}
      className="w-full py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium transition"
    >
      关闭
    </button>
  );
}
