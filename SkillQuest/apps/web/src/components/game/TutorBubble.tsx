/**
 * TutorBubble — AI tutor feedback bubble
 *
 * Self-contained component that POSTs a level performance to
 * `/gamification/levels/:levelId/tutor-feedback` via `fetchTutorFeedback()`
 * and renders the tutor's response in a speech-bubble style. Renders nothing
 * until `performance` is provided (so it can be mounted ahead of time and
 * triggered by a prop change after the game finishes).
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageCircle } from 'lucide-react';
import {
  fetchTutorFeedback,
  type TutorFeedbackRequest,
  type TutorFeedbackResponse,
} from '../../lib/api-client';

export interface TutorBubbleProps {
  levelId: string;
  /** When set, the bubble will request feedback. Pass null/undefined to hide. */
  performance?: TutorFeedbackRequest | null;
}

export default function TutorBubble({ levelId, performance }: TutorBubbleProps) {
  const [data, setData] = useState<TutorFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!performance) {
      const t = setTimeout(() => setData(null), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    const t0 = setTimeout(() => {
      if (!alive) return;
      setLoading(true);
      setError(null);
    }, 0);
    (async () => {
      const res = await fetchTutorFeedback(levelId, performance);
      if (!alive) return;
      if (!res) {
        setError('导师点评暂时不可用');
      } else {
        setData(res);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
      clearTimeout(t0);
    };
  }, [levelId, performance]);

  if (!performance) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="relative flex w-full max-w-md items-start gap-3 rounded-2xl border border-indigo-500/30 bg-gray-900/80 backdrop-blur-xl p-4"
        role="status"
      >
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 text-xl">
          {data?.avatar ?? '🤖'}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-indigo-300">
              {data?.tutorName ?? '导师点评'}
            </span>
            {data?.fallback && (
              <span className="rounded-full border border-gray-700 bg-gray-800 px-2 text-[10px] text-gray-500">
                离线模板
              </span>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              正在思考…
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {data && (
            <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
              {data.message}
            </p>
          )}
        </div>

        {/* Decorative icon in corner */}
        <MessageCircle
          size={14}
          className="absolute right-3 top-3 text-indigo-500/40"
          strokeWidth={1.5}
        />
      </motion.div>
    </AnimatePresence>
  );
}
