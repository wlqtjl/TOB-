/**
 * StoryIntroPage — Data Center Crisis Simulator Entry
 *
 * Immersive narrative intro: "WARNING: Core service offline, 50,000 users affected"
 * Uses Framer Motion for dramatic warning animations.
 * Player transitions from "doing coursework" to "saving the data center."
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Server,
  Activity,
  Shield,
  Zap,
  ArrowRight,
  Radio,
} from 'lucide-react';

interface StoryIntroProps {
  /** Course title for the mission */
  courseTitle: string;
  /** Number of levels / tasks remaining */
  missionCount: number;
  /** Callback when player clicks "Accept Mission" */
  onAccept: () => void;
  /** Optional custom crisis message */
  crisisMessage?: string;
}

/** Cosmetic urgency countdown — creates tension but doesn't enforce failure */
const URGENCY_COUNTDOWN_SECONDS = 30;

// Simulated log messages for immersion
const SYSTEM_LOGS = [
  { time: '10:32:01', msg: '[CRITICAL] ZBS 存储集群心跳丢失', level: 'error' },
  { time: '10:32:03', msg: '[WARNING] 副本同步延迟超过阈值 > 5000ms', level: 'warn' },
  { time: '10:32:05', msg: '[ALERT] CloudTower 监控触发 P0 告警', level: 'error' },
  { time: '10:32:07', msg: '[INFO] 自动故障转移程序启动中...', level: 'info' },
  { time: '10:32:09', msg: '[CRITICAL] 虚拟机迁移队列积压 127 个任务', level: 'error' },
  { time: '10:32:11', msg: '[WARNING] 节点 Node-03 CPU 使用率 98.7%', level: 'warn' },
  { time: '10:32:13', msg: '[ALERT] 等待工程师接入...', level: 'info' },
];

const AFFECTED_SERVICES = [
  { name: '生产虚拟机', count: 342, status: 'critical' },
  { name: '存储卷', count: 1205, status: 'degraded' },
  { name: '网络连接', count: 89, status: 'warning' },
  { name: '用户会话', count: 50000, status: 'critical' },
];

export default function StoryIntroPage({
  courseTitle,
  missionCount,
  onAccept,
  crisisMessage,
}: StoryIntroProps) {
  const [phase, setPhase] = useState<'warning' | 'logs' | 'briefing'>('warning');
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [countdownSec, setCountdownSec] = useState(URGENCY_COUNTDOWN_SECONDS);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logs'), 2500);
    const t2 = setTimeout(() => setPhase('briefing'), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Typewriter log effect
  useEffect(() => {
    if (phase !== 'logs' && phase !== 'briefing') return;
    if (visibleLogs >= SYSTEM_LOGS.length) return;
    const t = setTimeout(() => setVisibleLogs((v) => v + 1), 400);
    return () => clearTimeout(t);
  }, [phase, visibleLogs]);

  // Countdown timer (cosmetic urgency, not enforced)
  useEffect(() => {
    if (phase !== 'briefing') return;
    if (countdownSec <= 0) return;
    const t = setInterval(() => setCountdownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, countdownSec]);

  const handleAccept = useCallback(() => {
    onAccept();
  }, [onAccept]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 overflow-hidden">
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />

      {/* Pulsing red border for urgency */}
      <motion.div
        className="pointer-events-none absolute inset-0 border-2 border-red-500/30"
        animate={{ borderColor: ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)', 'rgba(239,68,68,0.1)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative z-10 w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {/* ── Phase 1: Big Warning ── */}
          {phase === 'warning' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="mx-auto mb-6"
              >
                <AlertTriangle size={80} className="mx-auto text-red-500" strokeWidth={1.5} />
              </motion.div>
              <motion.h1
                className="text-4xl font-bold text-red-500 tracking-wider"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ⚠ 紧急警报 ⚠
              </motion.h1>
              <p className="mt-4 text-lg text-red-400/80 font-mono">
                {crisisMessage ?? '核心服务离线 — 影响 50,000 用户'}
              </p>
            </motion.div>
          )}

          {/* ── Phase 2: System Logs ── */}
          {phase === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                <Radio size={14} className="animate-pulse" />
                系统日志实时监控
              </div>
              <div className="rounded-xl border border-red-900/40 bg-gray-900/80 p-4 font-mono text-xs max-h-[200px] overflow-hidden">
                {SYSTEM_LOGS.slice(0, visibleLogs).map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`py-0.5 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}
                  >
                    <span className="text-gray-600">{log.time}</span> {log.msg}
                  </motion.div>
                ))}
                {visibleLogs < SYSTEM_LOGS.length && (
                  <span className="inline-block w-2 h-3 bg-red-400 animate-pulse ml-1" />
                )}
              </div>
            </motion.div>
          )}

          {/* ── Phase 3: Mission Briefing ── */}
          {phase === 'briefing' && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Crisis header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30"
                >
                  <Server size={32} className="text-red-400" />
                </motion.div>
                <h1 className="text-2xl font-bold text-white">数据中心危机</h1>
                <p className="mt-2 text-sm text-gray-400">{courseTitle}</p>
              </div>

              {/* System log (compact) */}
              <div className="rounded-xl border border-red-900/30 bg-gray-900/60 p-3 font-mono text-xs max-h-[100px] overflow-y-auto">
                {SYSTEM_LOGS.map((log, i) => (
                  <div key={i} className={`py-0.5 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    'text-gray-500'
                  }`}>
                    <span className="text-gray-600">{log.time}</span> {log.msg}
                  </div>
                ))}
              </div>

              {/* Affected services */}
              <div className="grid grid-cols-2 gap-3">
                {AFFECTED_SERVICES.map((svc) => (
                  <div
                    key={svc.name}
                    className={`rounded-lg border p-3 ${
                      svc.status === 'critical'
                        ? 'border-red-800/40 bg-red-950/30'
                        : svc.status === 'degraded'
                        ? 'border-yellow-800/30 bg-yellow-950/20'
                        : 'border-orange-800/30 bg-orange-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{svc.name}</span>
                      <Activity size={12} className={
                        svc.status === 'critical' ? 'text-red-400 animate-pulse' :
                        svc.status === 'degraded' ? 'text-yellow-400' :
                        'text-orange-400'
                      } />
                    </div>
                    <p className="mt-1 text-lg font-bold text-white font-mono">
                      {svc.count.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mission brief */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <Shield size={16} className="text-blue-400" />
                  救援任务简报
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  数据中心核心服务出现严重故障，需要你立即介入排查。
                  完成 <span className="text-blue-400 font-mono font-bold">{missionCount}</span> 个诊断任务来恢复服务。
                  每个任务对应一个真实的故障排查场景。
                </p>
              </div>

              {/* Countdown + Accept */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <Zap size={14} className="text-yellow-400" />
                  <span className={`${countdownSec < 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                    响应倒计时 {Math.floor(countdownSec / 60)}:{(countdownSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <motion.button
                  onClick={handleAccept}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-500"
                >
                  接受任务
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
