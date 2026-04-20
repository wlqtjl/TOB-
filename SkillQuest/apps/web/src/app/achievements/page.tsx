/**
 * Achievements — Badge gallery with player level progress
 */

'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Target,
  BookOpen,
  Sparkles,
  Crown,
  Flame,
  Zap,
  Award,
  TrendingUp,
  Star,
  Lock,
} from 'lucide-react';

const MOCK_BADGES = [
  { id: '1', key: 'first_clear', name: 'First Clear', description: 'Complete your first level', icon: 'Shield', category: 'progress', rarity: 'common', earned: true, unlockedAt: '2026-04-10', hidden: false },
  { id: '2', key: 'five_clears', name: 'Five Clears', description: 'Complete 5 levels', icon: 'Target', category: 'progress', rarity: 'uncommon', earned: true, unlockedAt: '2026-04-11', hidden: false },
  { id: '3', key: 'ten_clears', name: 'Dedicated Learner', description: 'Complete 10 levels', icon: 'BookOpen', category: 'progress', rarity: 'rare', earned: false, hidden: false },
  { id: '4', key: 'perfect_score', name: 'Perfect Score', description: 'Score 100% on a level', icon: 'Sparkles', category: 'mastery', rarity: 'uncommon', earned: true, unlockedAt: '2026-04-11', hidden: false },
  { id: '5', key: 'triple_perfect', name: 'Triple Perfect', description: 'Score 100% on 3 levels', icon: 'Crown', category: 'mastery', rarity: 'rare', earned: false, hidden: false },
  { id: '6', key: 'streak_3', name: '3-Day Streak', description: 'Study 3 days in a row', icon: 'Flame', category: 'streak', rarity: 'common', earned: true, unlockedAt: '2026-04-12', hidden: false },
  { id: '7', key: 'streak_7', name: 'Weekly Warrior', description: 'Study 7 days in a row', icon: 'Zap', category: 'streak', rarity: 'uncommon', earned: false, hidden: false },
  { id: '8', key: 'streak_30', name: 'Monthly Master', description: 'Study 30 days in a row', icon: 'Award', category: 'streak', rarity: 'epic', earned: false, hidden: false },
  { id: '9', key: 'xp_1000', name: 'XP Hunter', description: 'Earn 1000 total XP', icon: 'TrendingUp', category: 'mastery', rarity: 'rare', earned: false, hidden: false },
  { id: '10', key: 'star_50', name: 'Star Collector', description: 'Collect 50 stars', icon: 'Star', category: 'mastery', rarity: 'epic', earned: false, hidden: false },
  // Hidden achievements — only revealed when earned
  { id: '11', key: 'night_owl', name: '夜鹰工程师', description: '在凌晨 2-5 点完成一个关卡', icon: 'Zap', category: 'special', rarity: 'epic', earned: true, unlockedAt: '2026-04-15', hidden: true },
  { id: '12', key: 'speed_demon', name: '闪电侠', description: '在 30 秒内完成一个关卡', icon: 'Zap', category: 'special', rarity: 'legendary', earned: false, hidden: true },
  { id: '13', key: 'comeback_king', name: '逆袭王者', description: '从排行榜最后一名升至前三', icon: 'Crown', category: 'special', rarity: 'legendary', earned: false, hidden: true },
  { id: '14', key: 'crisis_hero', name: '危机英雄', description: '完成所有数据中心救援任务', icon: 'Shield', category: 'special', rarity: 'legendary', earned: false, hidden: true },
  { id: '15', key: 'sprint_master', name: '冲刺大师', description: '在冲刺模式中获得满分', icon: 'Target', category: 'special', rarity: 'epic', earned: false, hidden: true },
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Shield, Target, BookOpen, Sparkles, Crown, Flame, Zap, Award, TrendingUp, Star,
};

const RARITY_COLORS: Record<string, string> = {
  common: 'border-base-400',
  uncommon: 'border-green-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-yellow-400',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-base-400/10',
  uncommon: 'bg-emerald-500/10',
  rare: 'bg-blue-400/10',
  epic: 'bg-purple-400/10',
  legendary: 'bg-gradient-to-br from-yellow-400/10 to-amber-500/10',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: '',
  rare: 'shadow-blue-500/20 shadow-lg',
  epic: 'shadow-purple-500/20 shadow-lg',
  legendary: 'shadow-yellow-500/30 shadow-xl animate-pulse',
};

const RARITY_LABELS: Record<string, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

const CATEGORIES = ['all', 'progress', 'mastery', 'streak', 'special'];

const MOCK_PLAYER = { level: 5, title: 'Intermediate', xp: 750, nextLevelXp: 1000, totalBadges: 4, streak: 3 };

function AchievementsContent() {
  const [filter, setFilter] = useState('all');
  const filtered = (filter === 'all' ? MOCK_BADGES : MOCK_BADGES.filter((b) => b.category === filter))
    .filter((b) => !b.hidden || b.earned); // Only show hidden badges if earned
  const earnedCount = MOCK_BADGES.filter((b) => b.earned).length;
  const hiddenTotal = MOCK_BADGES.filter((b) => b.hidden).length;
  const hiddenEarned = MOCK_BADGES.filter((b) => b.hidden && b.earned).length;
  const xpProgress = Math.round((MOCK_PLAYER.xp / MOCK_PLAYER.nextLevelXp) * 100);

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-base-900">Achievements</h1>
            <p className="mt-1 text-sm text-base-400">{earnedCount}/{MOCK_BADGES.length} badges earned</p>
          </div>
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 hover:text-base-900 hover:bg-base-100 transition">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Home
          </Link>
        </div>

        {/* Player Level */}
        <div className="mb-8 rounded-2xl border border-base-200 bg-white p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg">
                {MOCK_PLAYER.level}
              </div>
              <div>
                <p className="text-base font-semibold text-base-900">Level {MOCK_PLAYER.level}</p>
                <p className="text-xs text-base-400">{MOCK_PLAYER.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-base-900">{MOCK_PLAYER.xp} / {MOCK_PLAYER.nextLevelXp} XP</p>
              <p className="text-xs text-base-400">{xpProgress}% to next level</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-base-100 overflow-hidden">
            <div className="h-full rounded-full bg-accent/60 transition-all" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Badges Earned', value: earnedCount },
            { label: 'Total XP', value: MOCK_PLAYER.xp },
            { label: 'Current Streak', value: `${MOCK_PLAYER.streak} days` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-base-200 bg-white px-4 py-4 text-center">
              <p className="text-lg font-semibold text-base-900">{s.value}</p>
              <p className="text-xs text-base-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                filter === cat ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-800 hover:bg-base-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((badge) => {
            const IconComp = ICON_MAP[badge.icon] ?? Shield;
            const glow = badge.earned ? (RARITY_GLOW[badge.rarity] ?? '') : '';
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border-2 p-5 transition-all ${glow} ${
                  badge.earned
                    ? `${RARITY_COLORS[badge.rarity]} ${RARITY_BG[badge.rarity]}`
                    : 'border-base-200/40 bg-white opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${badge.earned ? RARITY_BG[badge.rarity] : 'bg-base-100'}`}>
                    {badge.earned ? (
                      <IconComp size={20} strokeWidth={1.5} className="text-base-900" />
                    ) : (
                      <Lock size={20} strokeWidth={1.5} className="text-base-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-base-900">{badge.name}</p>
                      {badge.hidden && badge.earned && (
                        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">隐藏</span>
                      )}
                    </div>
                    <p className="text-xs text-base-400 mt-0.5">{badge.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-medium ${badge.earned ? 'text-base-600' : 'text-base-400'}`}>
                        {RARITY_LABELS[badge.rarity] ?? badge.rarity}
                      </span>
                      {badge.earned && badge.unlockedAt && (
                        <span className="text-xs text-base-400">{badge.unlockedAt}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hidden achievements hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-base-400">
            🔮 隐藏成就 {hiddenEarned}/{hiddenTotal} · 继续探索以解锁更多神秘成就
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-base-400 animate-pulse">Loading achievements...</p></div>}>
      <AchievementsContent />
    </Suspense>
  );
}
