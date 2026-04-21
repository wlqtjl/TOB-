/**
 * ApiDailyQuest — backend-backed daily quest card
 *
 * Consumes `fetchDailyQuest()` / `completeDailyQuestApi()` from api-client.
 * Displays the 3 randomly-picked levels for today, with a stars selector
 * (0-3) and a 提交 button that POSTs to the gamification endpoint.
 *
 * Null-safe: if the API is unavailable (no auth, no `NEXT_PUBLIC_API_URL`),
 * the card renders a neutral "请登录以查看今日题库" hint so the rest of the
 * page still works.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Star, Loader2 } from 'lucide-react';
import {
  fetchDailyQuest,
  completeDailyQuestApi,
  type DailyQuestRecord,
} from '../../lib/api-client';

export interface ApiDailyQuestProps {
  /** Called after a successful complete POST. Useful for the parent to
   *  refresh the rank summary (since completion adds rank score). */
  onCompleted?: (quest: DailyQuestRecord) => void;
}

export default function ApiDailyQuest({ onCompleted }: ApiDailyQuestProps) {
  const [quest, setQuest] = useState<DailyQuestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      const q = await fetchDailyQuest();
      if (!alive) return;
      setQuest(q);
      if (q?.stars) setStars(q.stars);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quest || quest.completed || submitting) return;
    setSubmitting(true);
    setError(null);
    const updated = await completeDailyQuestApi(quest.id, stars);
    setSubmitting(false);
    if (!updated) {
      setError('提交失败，请稍后再试');
      return;
    }
    setQuest(updated);
    onCompleted?.(updated);
  }, [quest, stars, submitting, onCompleted]);

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          加载今日题库…
        </div>
      </div>
    );
  }

  // ── API unavailable ─────────────────────────────────────────────────
  if (!quest) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-400" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">今日题库</h2>
        </div>
        <p className="text-xs text-gray-500">
          后端未连接或尚未登录 —&nbsp;
          <Link href="/login" className="text-indigo-400 hover:underline">
            登录
          </Link>
          &nbsp;后再试。
        </p>
      </div>
    );
  }

  // ── Loaded ──────────────────────────────────────────────────────────
  const isCompleted = quest.completed;

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-indigo-400" strokeWidth={1.5} />
        <h2 className="text-lg font-bold text-white">今日题库</h2>
        <span className="ml-auto text-xs text-gray-500">{quest.date}</span>
      </div>

      {/* Questions */}
      <ol className="flex flex-col gap-2 mb-4">
        {quest.questions.map((q, idx) => (
          <motion.li
            key={q.levelId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-gray-700/40 bg-gray-800/50 p-3"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{q.title}</div>
              <div className="text-[11px] text-gray-500 truncate">{q.courseTitle}</div>
            </div>
          </motion.li>
        ))}
      </ol>

      {/* Stars selector + submit */}
      {isCompleted ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 size={18} strokeWidth={1.5} />
            已完成
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < quest.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">选择星数 (0-3)</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                    stars === n
                      ? 'border-yellow-400/50 bg-yellow-500/20 text-yellow-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                  type="button"
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 py-2 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-60"
            type="button"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                提交中…
              </>
            ) : (
              <>提交（+段位分）</>
            )}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
