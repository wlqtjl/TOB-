/**
 * LeaderboardToast — Real-time rank change notifications
 *
 * Simulates WebSocket-style push notifications for rank changes.
 * Shows toast messages like "李工程师 just surpassed you!" to trigger
 * competitive engagement ("revenge motivation").
 *
 * In production, connect to actual WebSocket endpoint.
 * For demo, uses a timer-based simulation.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Trophy, X } from 'lucide-react';

export interface RankNotification {
  id: string;
  type: 'overtaken' | 'you_rose' | 'streak' | 'achievement';
  message: string;
  detail?: string;
  timestamp: number;
}

// Simulated events for demo
const DEMO_EVENTS: Omit<RankNotification, 'id' | 'timestamp'>[] = [
  { type: 'overtaken', message: '谢天华 刚刚超越了你！', detail: '总分: 13,100 → 排名 #2' },
  { type: 'streak', message: '韩磊 达成 7 天连续学习！', detail: '已解锁「周末战士」成就' },
  { type: 'you_rose', message: '你的排名上升了！', detail: '第 3 名 → 第 2 名' },
  { type: 'achievement', message: '方晓 解锁了隐藏成就', detail: '「ZBS 大师」— 完成全部存储关卡' },
  { type: 'overtaken', message: '萧峰 正在逼近你的排名！', detail: '差距仅 200 分' },
  { type: 'you_rose', message: '连续答对 5 题！', detail: '连击奖励 +150 分' },
];

const NOTIFICATION_ICONS = {
  overtaken: TrendingDown,
  you_rose: TrendingUp,
  streak: Zap,
  achievement: Trophy,
};

const NOTIFICATION_STYLES = {
  overtaken: 'border-red-500/30 bg-red-950/80',
  you_rose: 'border-emerald-500/30 bg-emerald-950/80',
  streak: 'border-yellow-500/30 bg-yellow-950/80',
  achievement: 'border-purple-500/30 bg-purple-950/80',
};

const ICON_COLORS = {
  overtaken: 'text-red-400',
  you_rose: 'text-emerald-400',
  streak: 'text-yellow-400',
  achievement: 'text-purple-400',
};

interface LeaderboardToastProps {
  /** Whether to enable simulated notifications */
  enabled?: boolean;
  /** Interval between notifications (ms) */
  intervalMs?: number;
  /** Maximum visible notifications */
  maxVisible?: number;
}

export default function LeaderboardToast({
  enabled = true,
  intervalMs = 8000,
  maxVisible = 3,
}: LeaderboardToastProps) {
  const [notifications, setNotifications] = useState<RankNotification[]>([]);
  const eventIndexRef = useRef(0);

  const addNotification = useCallback((event: Omit<RankNotification, 'id' | 'timestamp'>) => {
    const notification: RankNotification = {
      ...event,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, maxVisible));
  }, [maxVisible]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Auto-remove after 5s
  useEffect(() => {
    if (notifications.length === 0) return;
    const oldest = notifications[notifications.length - 1];
    const age = Date.now() - oldest.timestamp;
    const remaining = Math.max(0, 5000 - age);
    const t = setTimeout(() => removeNotification(oldest.id), remaining);
    return () => clearTimeout(t);
  }, [notifications, removeNotification]);

  // Demo simulation
  useEffect(() => {
    if (!enabled) return;

    // Initial delay before first notification
    const initialDelay = setTimeout(() => {
      const event = DEMO_EVENTS[eventIndexRef.current % DEMO_EVENTS.length];
      addNotification(event);
      eventIndexRef.current++;
    }, 3000);

    const interval = setInterval(() => {
      const event = DEMO_EVENTS[eventIndexRef.current % DEMO_EVENTS.length];
      addNotification(event);
      eventIndexRef.current++;
    }, intervalMs);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [enabled, intervalMs, addNotification]);

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => {
          const Icon = NOTIFICATION_ICONS[notif.type];
          const style = NOTIFICATION_STYLES[notif.type];
          const iconColor = ICON_COLORS[notif.type];

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`rounded-xl border backdrop-blur-xl p-3 shadow-lg cursor-pointer ${style}`}
              onClick={() => removeNotification(notif.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${iconColor}`}>
                  <Icon size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {notif.message}
                  </p>
                  {notif.detail && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {notif.detail}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                  className="text-gray-500 hover:text-gray-300 transition"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
