/**
 * Daily Quests Page — /daily
 *
 * Showcases the daily quest system with a demo interface for testing.
 * In production, this would be integrated into the main dashboard.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import DailyQuests, { completeDailyQuest } from '../../components/game/DailyQuests';
import RankBadge from '../../components/game/RankBadge';
import { ArrowLeft, Zap } from 'lucide-react';

export default function DailyPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 transition"
          >
            <ArrowLeft size={14} /> 返回
          </Link>
          <RankBadge xp={3500} size="sm" />
        </div>

        {/* Daily Quests Card */}
        <DailyQuests
          onClaimReward={(type, xp) => {
            // In production, send to API: POST /api/quests/claim
            console.log(`Claimed ${type} quest reward: +${xp} XP`);
          }}
        />

        {/* Demo controls */}
        <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-900/60 p-4">
          <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
            <Zap size={14} className="text-yellow-400" />
            测试控制台
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '完成冲刺', type: 'sprint' as const },
              { label: '+1 连击', type: 'combo' as const },
              { label: '+1 星', type: 'stars' as const },
              { label: '+1 关卡', type: 'levels' as const },
            ].map((btn) => (
              <button
                key={btn.type}
                onClick={() => completeDailyQuest(btn.type)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:border-gray-500 transition"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
