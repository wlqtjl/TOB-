/**
 * SprintMode — 5-Minute Quick Quiz (Duolingo-style)
 *
 * Ultra-short learning cycles for fragment time:
 * - 5 minute countdown
 * - Quick-fire questions with instant feedback
 * - Streak tracking with bonus multiplier
 * - Micro-rewards after each sprint
 *
 * Designed to maximize "one more round" addiction loop.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Target,
  Flame,
  Star,
  Trophy,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SprintQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface SprintModeProps {
  /** Questions for this sprint */
  questions: SprintQuestion[];
  /** Course title */
  courseTitle: string;
  /** Sprint duration in seconds */
  durationSec?: number;
  /** Callback on sprint complete */
  onComplete: (result: SprintResult) => void;
  /** Callback to go back */
  onBack: () => void;
}

export interface SprintResult {
  correct: number;
  total: number;
  streak: number;
  score: number;
  timeUsed: number;
}

type Phase = 'countdown' | 'playing' | 'result';

// Demo questions for sprint mode
export const DEMO_SPRINT_QUESTIONS: SprintQuestion[] = [
  {
    id: 'sq1',
    question: 'ZBS 中，当一个存储节点宕机后，系统首先执行什么操作？',
    options: ['立即重建副本', '等待节点恢复', '通知管理员', '自动故障转移'],
    correctIndex: 3,
    explanation: '系统首先执行自动故障转移，确保服务可用性，然后再决定是否重建副本。',
  },
  {
    id: 'sq2',
    question: '在超融合架构中，计算和存储资源运行在：',
    options: ['独立的服务器上', '同一组服务器上', '云端虚拟机中', '专用存储阵列上'],
    correctIndex: 1,
    explanation: '超融合的核心理念是将计算和存储整合在同一组标准 x86 服务器上。',
  },
  {
    id: 'sq3',
    question: 'SMTX OS 默认使用几副本策略来保证数据可靠性？',
    options: ['1 副本', '2 副本', '3 副本', '4 副本'],
    correctIndex: 1,
    explanation: 'SMTX OS 默认使用 2 副本策略，在性能和可靠性之间取得平衡。',
  },
  {
    id: 'sq4',
    question: 'CloudTower 的主要角色是什么？',
    options: ['虚拟机管理', '多集群统一管理', '网络配置', '存储监控'],
    correctIndex: 1,
    explanation: 'CloudTower 是 SmartX 的多集群统一管理平台，提供监控、告警、资源调度等功能。',
  },
  {
    id: 'sq5',
    question: 'VMware 迁移到 SMTX OS 时，最关键的预检查项是？',
    options: ['网络带宽', '兼容性评估', '存储容量', 'CPU 型号'],
    correctIndex: 1,
    explanation: '兼容性评估是迁移前最关键的步骤，确保虚拟机配置与目标平台兼容。',
  },
  {
    id: 'sq6',
    question: '在 ZBS 架构中，Meta Leader 的作用是？',
    options: ['数据写入', '元数据管理', '网络路由', '日志收集'],
    correctIndex: 1,
    explanation: 'Meta Leader 负责管理集群的元数据，是 ZBS 架构的核心组件。',
  },
  {
    id: 'sq7',
    question: '超融合集群扩容时，哪种方式最推荐？',
    options: ['垂直扩展', '水平扩展', '混合扩展', '手动分配'],
    correctIndex: 1,
    explanation: '超融合架构天然支持水平扩展，添加新节点即可线性增加计算和存储资源。',
  },
  {
    id: 'sq8',
    question: '当两个副本同时损坏时，ZBS 如何保证数据完整性？',
    options: ['自动恢复', '依赖第三方备份', '无法恢复', '从快照恢复'],
    correctIndex: 2,
    explanation: '使用 2 副本策略时，两个副本同时损坏会导致数据丢失，这也是建议关键数据使用 3 副本的原因。',
  },
];

export default function SprintMode({
  questions,
  courseTitle,
  durationSec = 300,
  onComplete,
  onBack,
}: SprintModeProps) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      startTimeRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  const finishSprint = useCallback(() => {
    setPhase('result');
    onComplete({
      correct,
      total: answered,
      streak: maxStreak,
      score,
      timeUsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
    });
  }, [correct, answered, maxStreak, score, onComplete]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      finishSprint();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, finishSprint]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setShowResult(true);

    const q = questions[currentQ % questions.length];
    const isCorrect = optionIndex === q.correctIndex;

    if (isCorrect) {
      const streakBonus = Math.min(streak, 5) * 10;
      const basePoints = 100;
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
      setMaxStreak((m) => Math.max(m, streak + 1));
      setScore((s) => s + basePoints + streakBonus);
    } else {
      setStreak(0);
    }
    setAnswered((a) => a + 1);

    // Auto-advance after feedback
    setTimeout(() => {
      setSelected(null);
      setShowResult(false);
      setCurrentQ((q) => q + 1);
    }, 1200);
  }, [selected, questions, currentQ, streak]);

  const currentQuestion = questions[currentQ % questions.length];
  const progressPct = (timeLeft / durationSec) * 100;

  // ── Countdown Screen ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNum}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            {countdownNum > 0 ? (
              <span className="text-8xl font-bold text-white font-mono">{countdownNum}</span>
            ) : (
              <div className="flex items-center gap-3 text-4xl font-bold text-amber-400">
                <Zap size={48} />
                GO!
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Result Screen ──
  if (phase === 'result') {
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const starCount = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <Trophy size={48} className="mx-auto text-amber-400 mb-4" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">冲刺完成！</h1>
            <p className="mt-1 text-sm text-gray-400">{courseTitle}</p>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3].map((s) => (
              <motion.div
                key={s}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: s <= starCount ? 1 : 0.5, rotate: 0 }}
                transition={{ delay: 0.4 + s * 0.15, type: 'spring' }}
              >
                <Star size={36} className={s <= starCount ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 mb-6">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-amber-400 font-mono">{score}</p>
              <p className="text-xs text-gray-500">总得分</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span className="font-semibold">{correct}/{answered}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">正确率 {accuracy}%</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-orange-400">
                  <Flame size={14} />
                  <span className="font-semibold">{maxStreak}x</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">最大连击</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-blue-400">
                  <Clock size={14} />
                  <span className="font-semibold">{durationSec - timeLeft}s</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">用时</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 rounded-xl border border-gray-700 px-4 py-3 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
            >
              返回
            </button>
            <button
              onClick={() => {
                setPhase('countdown');
                setCountdownNum(3);
                setCurrentQ(0);
                setSelected(null);
                setShowResult(false);
                setTimeLeft(durationSec);
                setCorrect(0);
                setStreak(0);
                setMaxStreak(0);
                setScore(0);
                setAnswered(0);
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-400"
            >
              <RotateCcw size={16} />
              再来一轮
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Playing Screen ──
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Timer bar */}
      <div className="relative h-1.5 bg-gray-800">
        <motion.div
          className={`h-full transition-colors ${
            timeLeft < 30 ? 'bg-red-500' : timeLeft < 60 ? 'bg-yellow-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock size={14} className={timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-gray-400'} />
            <span className={`font-mono font-medium ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          {streak >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-xs font-medium text-orange-400"
            >
              <Flame size={12} />
              {streak}x 连击
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            <Target size={14} className="inline mr-1" />
            {correct}/{answered}
          </span>
          <span className="font-mono font-medium text-amber-400">{score}</span>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-mono text-gray-400">
                    Q{answered + 1}
                  </span>
                  <Zap size={14} className="text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-white leading-relaxed">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => {
                  let style = 'border-gray-700 bg-gray-900/60 text-gray-200 hover:border-gray-600 hover:bg-gray-800/60';
                  if (selected !== null) {
                    if (i === currentQuestion.correctIndex) {
                      style = 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300';
                    } else if (i === selected && i !== currentQuestion.correctIndex) {
                      style = 'border-red-500/50 bg-red-950/40 text-red-300';
                    } else {
                      style = 'border-gray-800 bg-gray-900/30 text-gray-600';
                    }
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={selected !== null}
                      whileHover={selected === null ? { scale: 1.02 } : undefined}
                      whileTap={selected === null ? { scale: 0.98 } : undefined}
                      className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${style}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/60 text-xs font-mono text-gray-400">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {selected !== null && i === currentQuestion.correctIndex && (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        )}
                        {selected !== null && i === selected && i !== currentQuestion.correctIndex && (
                          <XCircle size={18} className="text-red-400" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {showResult && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3"
                  >
                    <p className="text-xs text-gray-400 leading-relaxed">
                      💡 {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
