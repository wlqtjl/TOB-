/**
 * DailyQuests — Daily mission card with reset-at-midnight persistence
 *
 * Shows 4 daily quests that reset every day. Quest progress is stored in
 * localStorage and validated against the current date (YYYY-MM-DD).
 *
 * Other components can import `completeDailyQuest()` to update progress
 * from anywhere in the app — it writes directly to localStorage and
 * dispatches a custom event so the card re-renders automatically.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Gift, Sparkles } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DailyQuestType = 'sprint' | 'combo' | 'stars' | 'levels';

export interface DailyQuest {
  type: DailyQuestType;
  title: string;
  icon: string;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
}

export interface DailyQuestsProps {
  /** Called when a quest reward is claimed */
  onClaimReward?: (questType: DailyQuestType, xp: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'skillquest_daily_quests';
const QUEST_UPDATE_EVENT = 'skillquest:daily-quest-update';

const DEFAULT_QUESTS: DailyQuest[] = [
  { type: 'sprint', title: '完成一轮冲刺', icon: '🎯', target: 1, current: 0, completed: false, claimed: false, xpReward: 50 },
  { type: 'combo',  title: '达成 5 连击',   icon: '🔥', target: 5, current: 0, completed: false, claimed: false, xpReward: 100 },
  { type: 'stars',  title: '获得 3 星评价', icon: '⭐', target: 3, current: 0, completed: false, claimed: false, xpReward: 75 },
  { type: 'levels', title: '完成 3 个关卡', icon: '📚', target: 3, current: 0, completed: false, claimed: false, xpReward: 150 },
];

interface StoredData {
  date: string;
  quests: DailyQuest[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function loadQuests(): DailyQuest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUESTS.map((q) => ({ ...q }));

    const data: StoredData = JSON.parse(raw);
    if (data.date !== getTodayStr()) {
      return DEFAULT_QUESTS.map((q) => ({ ...q }));
    }
    return data.quests;
  } catch {
    return DEFAULT_QUESTS.map((q) => ({ ...q }));
  }
}

function saveQuests(quests: DailyQuest[]): void {
  const data: StoredData = { date: getTodayStr(), quests };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Public API — call from other components ─────────────────────────────────

/**
 * Update progress for a daily quest.
 * Writes to localStorage and dispatches a custom event so the DailyQuests
 * card re-renders automatically.
 *
 * @param questType — which quest to update
 * @param amount — amount to add (default 1)
 */
export function completeDailyQuest(questType: DailyQuestType, amount = 1): void {
  const quests = loadQuests();
  const quest = quests.find((q) => q.type === questType);
  if (!quest || quest.completed) return;

  quest.current = Math.min(quest.current + amount, quest.target);
  if (quest.current >= quest.target) {
    quest.completed = true;
  }
  saveQuests(quests);
  window.dispatchEvent(new CustomEvent(QUEST_UPDATE_EVENT));
}

// ─── Styling maps (JIT-safe) ─────────────────────────────────────────────────

const PROGRESS_BG: Record<DailyQuestType, string> = {
  sprint: 'bg-indigo-500',
  combo:  'bg-orange-500',
  stars:  'bg-yellow-500',
  levels: 'bg-emerald-500',
};

const CLAIMED_GLOW: Record<DailyQuestType, string> = {
  sprint: '0 0 12px rgba(99,102,241,0.4)',
  combo:  '0 0 12px rgba(249,115,22,0.4)',
  stars:  '0 0 12px rgba(234,179,8,0.4)',
  levels: '0 0 12px rgba(16,185,129,0.4)',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DailyQuests({ onClaimReward }: DailyQuestsProps) {
  const [quests, setQuests] = useState<DailyQuest[]>(() => loadQuests());
  const [claimingType, setClaimingType] = useState<DailyQuestType | null>(null);

  // Sync when other components call completeDailyQuest()
  useEffect(() => {
    const handler = () => setQuests(loadQuests());
    window.addEventListener(QUEST_UPDATE_EVENT, handler);
    // Also handle storage changes from other tabs
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(QUEST_UPDATE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const handleClaim = useCallback(
    (quest: DailyQuest) => {
      if (!quest.completed || quest.claimed) return;

      setClaimingType(quest.type);

      // Slight delay so the XP float animation can play
      setTimeout(() => {
        const updated = quests.map((q) =>
          q.type === quest.type ? { ...q, claimed: true } : q,
        );
        setQuests(updated);
        saveQuests(updated);
        onClaimReward?.(quest.type, quest.xpReward);
        setClaimingType(null);
      }, 800);
    },
    [quests, onClaimReward],
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-yellow-400" strokeWidth={1.5} />
        <h2 className="text-lg font-bold text-white">每日任务</h2>
        <span className="ml-auto text-xs text-gray-500">{getTodayStr()}</span>
      </div>

      {/* Quest list */}
      <div className="flex flex-col gap-3">
        {quests.map((quest, index) => {
          const progressPct = Math.round((quest.current / quest.target) * 100);
          const isClaiming = claimingType === quest.type;

          return (
            <motion.div
              key={quest.type}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
                type: 'spring',
                damping: 20,
                stiffness: 300,
              }}
              className={`relative rounded-xl border p-3 transition-colors ${
                quest.claimed
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-gray-700/40 bg-gray-800/50'
              }`}
              style={quest.claimed ? { boxShadow: CLAIMED_GLOW[quest.type] } : undefined}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <span className="text-2xl leading-none">{quest.icon}</span>

                {/* Title + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        quest.claimed ? 'text-gray-500 line-through' : 'text-white'
                      }`}
                    >
                      {quest.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {quest.current}/{quest.target}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-700/60">
                    <motion.div
                      className={`h-full rounded-full ${PROGRESS_BG[quest.type]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    />
                  </div>
                </div>

                {/* Claim button / checkmark */}
                <div className="relative flex-shrink-0">
                  {quest.claimed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 300 }}
                    >
                      <CheckCircle2 size={22} className="text-emerald-400" strokeWidth={1.5} />
                    </motion.div>
                  ) : quest.completed ? (
                    <motion.button
                      onClick={() => handleClaim(quest)}
                      className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Gift size={14} strokeWidth={1.5} />
                      +{quest.xpReward}
                    </motion.button>
                  ) : (
                    <span className="text-xs text-gray-600">{quest.xpReward} XP</span>
                  )}

                  {/* XP float animation on claim */}
                  <AnimatePresence>
                    {isClaiming && (
                      <motion.span
                        className="absolute -top-2 left-1/2 text-sm font-bold text-yellow-400 pointer-events-none whitespace-nowrap"
                        initial={{ opacity: 1, y: 0, x: '-50%' }}
                        animate={{ opacity: 0, y: -32, x: '-50%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      >
                        +{quest.xpReward} XP
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
