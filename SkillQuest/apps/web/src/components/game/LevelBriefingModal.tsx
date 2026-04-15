'use client';

/**
 * LevelBriefingModal — 关卡前知识普及弹窗
 *
 * 在正式开始闯关前，向用户展示：
 * 1. 本关要学什么知识（核心知识点列表）
 * 2. 本关的目标是什么（任务目标）
 * 3. 关卡类型、预计时间、难度等信息
 * 4. 可选的小贴士/攻略
 *
 * 设计风格：与项目设计系统一致 (deep navy base, accent blue, frosted glass, Lucide icons)
 */

import React, { useState, useCallback } from 'react';
import {
  BookOpen,
  Target,
  Clock,
  Lightbulb,
  ChevronRight,
  Gamepad2,
  BarChart3,
  X,
} from 'lucide-react';
import type { LevelBriefing } from '@skillquest/types';

interface LevelBriefingModalProps {
  briefing: LevelBriefing;
  onStart: () => void;
  onSkip?: () => void;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: '入门', color: 'text-emerald-600', bg: 'bg-emerald-50 border-green-500/20' },
  intermediate: { label: '进阶', color: 'text-amber-600', bg: 'bg-yellow-500/10 border-amber-200' },
  advanced: { label: '高级', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export default function LevelBriefingModal({ briefing, onStart, onSkip }: LevelBriefingModalProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const diffConfig = DIFFICULTY_CONFIG[briefing.difficulty] || DIFFICULTY_CONFIG.beginner;

  const toggleKnowledgePoint = useCallback((term: string) => {
    setExpanded((prev) => (prev === term ? null : term));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl glass-heavy shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-base-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20">
              <BookOpen size={20} strokeWidth={1.5} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-base-900 tracking-tight">
                {briefing.title}
              </h2>
              <p className="text-xs text-base-400 mt-0.5">{briefing.summary}</p>
            </div>
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="p-1.5 rounded-lg text-base-400 hover:text-base-800 hover:bg-base-100 transition"
              title="跳过知识普及"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* ── Meta bar ── */}
        <div className="px-6 py-3 flex items-center gap-4 text-xs text-base-600 border-b border-base-100">
          <span className="flex items-center gap-1.5">
            <Gamepad2 size={14} strokeWidth={1.5} className="text-accent/70" />
            {briefing.gameTypeHint}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} strokeWidth={1.5} className="text-accent/70" />
            约 {briefing.estimatedMinutes} 分钟
          </span>
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${diffConfig.bg}`}>
            <BarChart3 size={12} strokeWidth={1.5} className={diffConfig.color} />
            <span className={diffConfig.color}>{diffConfig.label}</span>
          </span>
        </div>

        {/* ── Content ── */}
        <div className="px-6 py-4 max-h-[420px] overflow-y-auto space-y-5">
          {/* Knowledge Points */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-base-800 mb-3">
              <BookOpen size={15} strokeWidth={1.5} className="text-accent" />
              本关知识点
            </h3>
            <div className="space-y-2">
              {briefing.knowledgePoints.map((kp) => (
                <button
                  key={kp.term}
                  onClick={() => toggleKnowledgePoint(kp.term)}
                  className="w-full text-left rounded-lg border border-base-200 bg-white/50 hover:bg-base-100 transition"
                >
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-accent font-medium">{kp.term}</span>
                    <ChevronRight
                      size={14}
                      strokeWidth={1.5}
                      className={`text-base-400 transition-transform ${expanded === kp.term ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {expanded === kp.term && (
                    <div className="px-3 pb-2.5 text-xs text-base-600 leading-relaxed border-t border-base-100 pt-2">
                      {kp.definition}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Objectives */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-base-800 mb-3">
              <Target size={15} strokeWidth={1.5} className="text-accent" />
              本关目标
            </h3>
            <ul className="space-y-1.5">
              {briefing.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    obj.primary ? 'bg-accent' : 'bg-base-500'
                  }`} />
                  <span className={obj.primary ? 'text-base-800' : 'text-base-400'}>
                    {obj.text}
                    {!obj.primary && <span className="ml-1.5 text-xs text-base-400">(可选)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tips */}
          {briefing.tips && briefing.tips.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-base-800 mb-3">
                <Lightbulb size={15} strokeWidth={1.5} className="text-amber-600/80" />
                小贴士
              </h3>
              <div className="rounded-lg border border-yellow-500/10 bg-amber-50 px-3 py-2.5 space-y-1.5">
                {briefing.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-base-600 leading-relaxed flex items-start gap-2">
                    <span className="text-amber-600/60 mt-0.5 flex-shrink-0">•</span>
                    {tip}
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-base-200 flex items-center justify-between">
          {onSkip ? (
            <button
              onClick={onSkip}
              className="text-xs text-base-400 hover:text-base-800 transition"
            >
              跳过
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onStart}
            className="flex items-center gap-2 rounded-lg bg-accent hover:bg-accent/90 px-5 py-2.5 text-sm font-medium text-base-900 transition"
          >
            开始闯关
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
