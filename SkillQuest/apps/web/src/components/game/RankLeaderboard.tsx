/**
 * RankLeaderboard — tenant-wide rank ladder
 *
 * Consumes `fetchRankLeaderboard(limit)` from api-client. Presents a vertical
 * list of users sorted by rankScore, showing avatar, name, rank badge, and
 * rankScore. Highlights the current user if `currentUserId` is provided.
 *
 * Shows loading and empty states. If the backend is unreachable it renders
 * a subtle hint rather than blowing up, so it can ship next to mock data.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trophy } from 'lucide-react';
import RankBadge, { type PlayerRankKey } from './RankBadge';
import {
  fetchRankLeaderboard,
  type RankSummary,
} from '../../lib/api-client';

export interface RankLeaderboardProps {
  limit?: number;
  currentUserId?: string;
}

export default function RankLeaderboard({
  limit = 20,
  currentUserId,
}: RankLeaderboardProps) {
  const [entries, setEntries] = useState<RankSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchRankLeaderboard(limit);
      if (!alive) return;
      setEntries(res);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400" strokeWidth={1.5} />
        <h2 className="text-lg font-bold text-white">段位排行榜</h2>
        <span className="ml-auto text-xs text-gray-500">Top {limit}</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          加载中…
        </div>
      )}

      {!loading && !entries && (
        <p className="py-6 text-center text-xs text-gray-500">
          无法加载排行榜数据。请确认已登录并且后端可用。
        </p>
      )}

      {!loading && entries && entries.length === 0 && (
        <p className="py-6 text-center text-xs text-gray-500">暂无玩家数据</p>
      )}

      {!loading && entries && entries.length > 0 && (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const isSelf = entry.userId === currentUserId;
            const rankKey = entry.rank.toLowerCase() as PlayerRankKey;
            return (
              <motion.li
                key={entry.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                  isSelf
                    ? 'border-indigo-400/40 bg-indigo-500/10'
                    : 'border-gray-700/40 bg-gray-800/40'
                }`}
              >
                {/* Rank # */}
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    idx === 0
                      ? 'bg-yellow-400/20 text-yellow-300'
                      : idx === 1
                      ? 'bg-gray-300/20 text-gray-200'
                      : idx === 2
                      ? 'bg-amber-700/30 text-amber-300'
                      : 'bg-gray-700/40 text-gray-400'
                  }`}
                >
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-700 text-xs text-gray-300">
                  {entry.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    entry.displayName.slice(0, 1)
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
                    {entry.displayName}
                    {isSelf && (
                      <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-1.5 text-[10px] text-indigo-300">
                        我
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {entry.rankScore.toLocaleString()} 分
                  </div>
                </div>

                {/* Rank badge (stars hidden — row is dense) */}
                <RankBadge
                  rank={rankKey}
                  rankScore={entry.rankScore}
                  showStars={false}
                  size="sm"
                />
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
