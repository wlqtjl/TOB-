'use client';

/**
 * InsightPanel — 交互式详情侧边栏
 *
 * 点击任意节点后滑出:
 * 1. 专家点评 (AI 根据 deviationNotice 生成的分析)
 * 2. 知识点溯源 (展示 sourceQuote 并高亮文档来源)
 * 3. 操作回放按钮 (触发 Canvas 回滚)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TimelineStep } from '@skillquest/types';
import {
  X,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface InsightPanelProps {
  step: TimelineStep | null;
  onClose: () => void;
  onRollback: (snapshot: unknown) => void;
}

/**
 * Typewriter hook for expert commentary
 */
function useTypewriter(text: string, speed: number = 30): string {
  const [displayed, setDisplayed] = useState('');
  const prevTextRef = useRef(text);

  useEffect(() => {
    // Reset when text changes
    prevTextRef.current = text;
    let index = 0;
    setDisplayed('');

    if (!text) return;

    const timer = setInterval(() => {
      index++;
      if (index <= text.length && prevTextRef.current === text) {
        setDisplayed(text.substring(0, index));
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayed;
}

/**
 * Generate expert commentary based on deviation notice
 */
function generateExpertCommentary(step: TimelineStep): string {
  if (step.status === 'correct') {
    return `操作正确。${step.actionName} 是标准排障流程中的关键步骤。${step.description}`;
  }
  if (step.deviationNotice) {
    return `偏离警告：${step.deviationNotice}\n\n专家建议：在执行 "${step.actionName}" 之前，应当先确认前置条件是否满足。此操作导致了 ${Math.abs(step.impactScore)} 点的风险增量。`;
  }
  return `此步骤存在改进空间。建议参考专家路径中同一阶段的操作，以减少风险暴露。`;
}

export default function InsightPanel({
  step,
  onClose,
  onRollback,
}: InsightPanelProps) {
  const commentary = step ? generateExpertCommentary(step) : '';
  const typedCommentary = useTypewriter(step ? commentary : '', 25);

  const handleRollback = useCallback(() => {
    if (step) {
      onRollback(step.worldStateSnapshot);
    }
  }, [step, onRollback]);

  const isVisible = step !== null;
  const isError = step?.status === 'error';
  const isWarning = step?.status === 'warning';
  const isCorrect = step?.status === 'correct';

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 z-50 h-full w-full max-w-md',
          'glass-heavy rounded-l-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {step && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-600/40">
              <div className="flex items-center gap-2">
                {isError && <AlertTriangle size={16} className="text-red-400" />}
                {isWarning && <AlertTriangle size={16} className="text-amber-400" />}
                {isCorrect && <CheckCircle size={16} className="text-emerald-400" />}
                <h3 className="text-sm font-semibold text-base-100">
                  操作详情
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-base-700/60 transition-colors text-base-400 hover:text-base-200"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Action summary */}
              <div>
                <h4 className="text-base font-medium text-base-100 mb-1">
                  {step.actionName}
                </h4>
                <p className="text-sm text-base-300 leading-relaxed">
                  {step.description}
                </p>
                {step.impactScore < 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-900/20 border border-red-500/20 px-3 py-1">
                    <AlertTriangle size={12} className="text-red-400" />
                    <span className="text-xs font-mono text-red-400">
                      风险影响: {step.impactScore} 分
                    </span>
                  </div>
                )}
              </div>

              {/* Expert Commentary — Typewriter */}
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <BookOpen size={14} className="text-accent" />
                  <span className="text-xs font-semibold text-accent">
                    专家点评
                  </span>
                </div>
                <p className="text-sm text-base-200 leading-relaxed whitespace-pre-line">
                  {typedCommentary}
                  {typedCommentary.length < commentary.length && (
                    <span className="animate-pulse text-accent">▌</span>
                  )}
                </p>
              </div>

              {/* Source Quote — Knowledge Tracing */}
              {step.sourceQuote && (
                <div className="rounded-xl border border-base-600/40 bg-base-800/60 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText size={14} className="text-base-300" />
                    <span className="text-xs font-semibold text-base-300">
                      知识点溯源
                    </span>
                  </div>
                  <blockquote className="text-sm text-base-200 leading-relaxed border-l-2 border-accent/40 pl-3 italic">
                    &ldquo;{step.sourceQuote}&rdquo;
                  </blockquote>
                  <p className="text-[11px] text-base-500 mt-2">
                    — SMTX OS 运维手册
                  </p>
                </div>
              )}

              {/* Deviation Notice — Full View */}
              {step.deviationNotice && (
                <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-semibold text-red-400">
                      偏离分析
                    </span>
                  </div>
                  <p className="text-sm text-red-300/90 leading-relaxed font-medium">
                    {step.deviationNotice}
                  </p>
                </div>
              )}
            </div>

            {/* Footer — Rollback button */}
            <div className="px-5 py-4 border-t border-base-600/40">
              <button
                onClick={handleRollback}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                回放此刻状态
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
